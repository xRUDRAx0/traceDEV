import os
import time
import uuid
import win32gui
import win32process
import psutil
import socketio
import datetime
from pynput import mouse, keyboard
import uiautomation as auto
import pyperclip
import pythoncom

# Create a Socket.IO client instance
sio = socketio.Client()

# Global state
is_observing = False
current_session_id = None
mouse_listener = None
keyboard_listener = None
typing_buffer = ""

# Track pressed keys for Ctrl+C
current_keys = set()

def get_active_window_info():
    """Retrieve active window title and process name using pywin32 and psutil."""
    try:
        hwnd = win32gui.GetForegroundWindow()
        window_title = win32gui.GetWindowText(hwnd)
        
        _, pid = win32process.GetWindowThreadProcessId(hwnd)
        process = psutil.Process(pid)
        process_name = process.name()
        
        return process_name, window_title
    except Exception as e:
        print(f"Error getting window info: {e}")
        return "Unknown", "Unknown"

def get_ui_element_info(x, y):
    """Attempt to get UI element info using uiautomation."""
    try:
        pythoncom.CoInitialize()
        # Timeout quickly to avoid lagging the mouse click
        auto.SetGlobalSearchTimeout(0.2)
        control = auto.ControlFromPoint(x, y)
        if control:
            name = control.Name or control.CurrentName()
            value = ""
            try:
                value = control.CurrentValue()
            except:
                pass
            
            if not name and value:
                name = value
                
            if not name:
                parent = control.GetParentControl()
                if parent:
                    name = parent.Name or parent.CurrentName()
                    
            return name, control.ControlTypeName, value
    except Exception as e:
        print(f"UI Automation Error: {e}")
    finally:
        pythoncom.CoUninitialize()
    return "Unknown Element", "Unknown Type", ""

def flush_typing_buffer():
    global typing_buffer, current_session_id
    if not typing_buffer:
        return
        
    try:
        process_name, window_title = get_active_window_info()
        app_name = process_name.replace('.exe', '').replace('.EXE', '').capitalize()
        
        event = {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "application": app_name,
            "windowTitle": window_title,
            "action": "type",
            "elementName": "Keyboard Input",
            "elementType": "Text",
            "x": 0,
            "y": 0,
            "sessionId": current_session_id,
            "metadata": {
                "typedText": typing_buffer
            }
        }
        print(f"Captured TYPING: {app_name} | {window_title} | Text: {typing_buffer}")
        sio.emit('new_event', event)
    except Exception as e:
        print(f"Error flushing typing buffer: {e}")
    finally:
        typing_buffer = ""

last_click_time = 0

def on_click(x, y, button, pressed):
    """Mouse click handler."""
    global is_observing, current_session_id, last_click_time
    if not is_observing or not pressed:
        return

    # Debounce to prevent double-clicks from hardware bounce
    current_time = time.time()
    if current_time - last_click_time < 0.2:
        return
    last_click_time = current_time

    # Flush any typing before recording the click
    flush_typing_buffer()

    # Only track left clicks for simplicity
    if button != mouse.Button.left:
        return

    try:
        process_name, window_title = get_active_window_info()
        app_name = process_name.replace('.exe', '').replace('.EXE', '').capitalize()

        # Build and emit the event immediately with available basic data
        # This guarantees the click is never lost, even if UI element lookup fails
        event = {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "application": app_name,
            "windowTitle": window_title,
            "action": "click",
            "elementName": "",
            "elementType": "Unknown",
            "x": x,
            "y": y,
            "sessionId": current_session_id,
            "metadata": {
                "elementValue": ""
            }
        }

        # Now try to enrich with UI element name (best-effort, won't block emit)
        try:
            element_name, element_type, element_value = get_ui_element_info(x, y)
            if element_name and element_name != "Unknown Element":
                event["elementName"] = element_name
            event["elementType"] = element_type
            event["metadata"]["elementValue"] = element_value
        except Exception as ui_err:
            pass  # Fine — we already have the basic event ready

        print(f"Captured: {app_name} | {window_title} | {event['elementName'] or f'({x},{y})'}")

        # Emit to backend
        sio.emit('new_event', event)

    except Exception as e:
        print(f"Error in on_click: {e}")

def on_press(key):
    global current_keys, is_observing, current_session_id, typing_buffer
    current_keys.add(key)
    
    if not is_observing:
        return
        
    try:
        # On Windows, pynput sends '\x03' for Ctrl+C. 
        # Alternatively check if 'c' is pressed while ctrl is in current_keys
        is_c = hasattr(key, 'char') and key.char in ['c', 'C', '\x03']
        ctrl_pressed = any(k in current_keys for k in [keyboard.Key.ctrl, keyboard.Key.ctrl_l, keyboard.Key.ctrl_r])
        
        if is_c and (ctrl_pressed or (hasattr(key, 'char') and key.char == '\x03')):
            # Wait briefly for OS to actually put data in clipboard
            time.sleep(0.2)
            clipboard_content = pyperclip.paste()
            
            process_name, window_title = get_active_window_info()
            app_name = process_name.replace('.exe', '').replace('.EXE', '').capitalize()
            
            event = {
                "id": str(uuid.uuid4()),
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "application": app_name,
                "windowTitle": window_title,
                "action": "copy",
                "elementName": "Clipboard",
                "elementType": "Text",
                "x": 0,
                "y": 0,
                "sessionId": current_session_id,
                "metadata": {
                    "clipboardData": clipboard_content
                }
            }
            print(f"Captured COPY: {app_name} | {window_title} | Data: {clipboard_content[:20]}...")
            sio.emit('new_event', event)
            return
            
        # Buffer regular typing
        if hasattr(key, 'char') and key.char is not None:
            # Ignore control characters
            if not ctrl_pressed and key.char.isprintable():
                typing_buffer += key.char
        else:
            if key == keyboard.Key.space:
                typing_buffer += ' '
            elif key == keyboard.Key.backspace:
                typing_buffer = typing_buffer[:-1]
            elif key in (keyboard.Key.enter, keyboard.Key.tab, keyboard.Key.esc):
                flush_typing_buffer()
                
                # Record the special key press
                key_name = key.name.upper()
                process_name, window_title = get_active_window_info()
                app_name = process_name.replace('.exe', '').replace('.EXE', '').capitalize()
                event = {
                    "id": str(uuid.uuid4()),
                    "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "application": app_name,
                    "windowTitle": window_title,
                    "action": "key_press",
                    "elementName": "Keyboard",
                    "elementType": "Input",
                    "x": 0,
                    "y": 0,
                    "sessionId": current_session_id,
                    "metadata": {
                        "key": key_name
                    }
                }
                print(f"Captured KEY_PRESS: {app_name} | {window_title} | Key: {key_name}")
                sio.emit('new_event', event)
            elif key in (keyboard.Key.up, keyboard.Key.down, keyboard.Key.left, keyboard.Key.right):
                flush_typing_buffer()
            
    except Exception as e:
        print(f"Error in keyboard detection: {e}")

def on_release(key):
    global current_keys, is_observing, current_session_id
    
    if key in current_keys:
        current_keys.remove(key)

@sio.event
def connect():
    print("Connected to TRACE Backend!")

@sio.event
def disconnect():
    print("Disconnected from TRACE Backend.")

@sio.on('observation_status')
def on_observation_status(data):
    """Receive Start/Stop commands from the frontend via backend."""
    global is_observing, current_session_id, mouse_listener, keyboard_listener
    print(f"Received observation_status: {data}")
    
    if data.get('active'):
        if not is_observing:
            print("Starting Observation...")
            is_observing = True
            current_session_id = data.get('sessionId', str(uuid.uuid4()))
            if mouse_listener is None or not mouse_listener.running:
                mouse_listener = mouse.Listener(on_click=on_click)
                mouse_listener.start()
            if keyboard_listener is None or not keyboard_listener.running:
                keyboard_listener = keyboard.Listener(on_press=on_press, on_release=on_release)
                keyboard_listener.start()
    else:
        if is_observing:
            print("Stopping Observation...")
            is_observing = False
            flush_typing_buffer() # Flush any remaining text
            if mouse_listener is not None:
                mouse_listener.stop()
                mouse_listener = None
            if keyboard_listener is not None:
                keyboard_listener.stop()
                keyboard_listener = None
            current_session_id = None

def main():
    print("Starting TRACE Local Observer Agent...")
    try:
        # Resolve backend URL from:
        # 1. Command-line argument
        # 2. SOCKET_SERVER_URL environment variable
        # 3. .env file in observer directory
        # 4. Default fallback: http://localhost:3001
        import sys
        backend_url = None
        if len(sys.argv) > 1:
            backend_url = sys.argv[1]
        
        if not backend_url:
            backend_url = os.environ.get("SOCKET_SERVER_URL")

        if not backend_url:
            env_path = os.path.join(os.path.dirname(__file__), ".env")
            if os.path.exists(env_path):
                try:
                    with open(env_path, "r") as f:
                        for line in f:
                            line = line.strip()
                            if line.startswith("SOCKET_SERVER_URL="):
                                backend_url = line.split("=", 1)[1].strip().strip('"').strip("'")
                                break
                except Exception:
                    pass

        if not backend_url:
            backend_url = "http://localhost:3001"
        
        print(f"Connecting to TRACE backend at {backend_url}...")
        sio.connect(backend_url)
        print("Waiting for observation commands...")
        
        # Fallback to initialize status
        sio.emit('request_status')
        
        sio.wait()
    except Exception as e:
        print(f"Failed to connect to backend: {e}")
        time.sleep(5)

if __name__ == "__main__":
    main()
