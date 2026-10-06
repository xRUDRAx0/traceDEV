import sys
import os
import json
import time

try:
    import win32com.client
except ImportError:
    print(json.dumps({"success": False, "error": "win32com is required. Install pywin32."}))
    sys.exit(1)

def get_excel(create_if_missing=True):
    try:
        # Try to hook into existing Excel instance
        excel = win32com.client.GetActiveObject("Excel.Application")
    except Exception:
        if not create_if_missing:
            return None
        try:
            excel = win32com.client.Dispatch("Excel.Application")
        except Exception as e:
            raise Exception(f"Could not start Excel: {str(e)}")
    
    excel.Visible = True
    return excel

def execute_action(action, target, value):
    try:
        if action == "OPEN_EXCEL":
            excel = get_excel(create_if_missing=True)
            if not os.path.exists(target):
                return {"success": False, "error": f"File not found: {target}"}
            
            # Close existing open workbooks to avoid confusion in the demo
            for wb in excel.Workbooks:
                wb.Close(SaveChanges=False)
                
            wb = excel.Workbooks.Open(target)
            return {"success": True, "message": f"Opened {target}"}
            
        elif action == "READ_EXCEL":
            excel = get_excel(create_if_missing=False)
            if not excel or excel.Workbooks.Count == 0:
                return {"success": False, "error": "No Excel workbook is open."}
            
            # Read visible data
            ws = excel.ActiveSheet
            data = []
            used_range = ws.UsedRange
            for row in used_range.Value:
                data.append(row)
                
            return {"success": True, "message": f"Read {len(data)} rows from Excel", "data": data}

        elif action == "PROCESS_SALES_DATA":
            excel = get_excel(create_if_missing=False)
            if not excel or excel.Workbooks.Count == 0:
                return {"success": False, "error": "No Excel workbook is open to process."}
                
            ws = excel.ActiveSheet
            
            # Perform a visible "macro" style processing step for demo purposes
            # We'll create a summary table on the sheet
            used_range = ws.UsedRange
            row_count = used_range.Rows.Count
            
            # Emulate human-like typing/formatting
            ws.Range(f"F1").Value = "Analysis"
            ws.Range(f"F1").Font.Bold = True
            
            ws.Range(f"F2").Value = "Total Revenue"
            ws.Range(f"G2").Formula = f"=SUM(C2:C{row_count})"
            
            ws.Range(f"F3").Value = "Order Count"
            ws.Range(f"G3").Formula = f"=COUNTA(A2:A{row_count})"
            
            ws.Range(f"F4").Value = "Top Region"
            ws.Range(f"G4").Value = "NA" # Simple dummy for visual effect
            
            ws.Columns("F:G").AutoFit()
            time.sleep(1) # Let the user see it
            
            return {"success": True, "message": "Processed sales data visibly."}
            
        elif action == "WRITE_EXCEL":
            excel = get_excel(create_if_missing=False)
            if not excel or excel.Workbooks.Count == 0:
                return {"success": False, "error": "No Excel workbook is open to save."}
            
            wb = excel.ActiveWorkbook
            
            # Ensure target directory exists
            target_dir = os.path.dirname(target)
            if not os.path.exists(target_dir):
                os.makedirs(target_dir)
                
            wb.SaveAs(target)
            return {"success": True, "message": f"Saved workbook to {target}"}
            
        elif action == "UPDATE_EXCEL":
            excel = get_excel(create_if_missing=False)
            if not excel or excel.Workbooks.Count == 0:
                return {"success": False, "error": "No Excel workbook open."}
                
            ws = excel.ActiveSheet
            used_range = ws.UsedRange
            row_count = used_range.Rows.Count
            
            # Add a new row representing the invoice data
            # Format: Invoice_No, Vendor, Amount, Status
            next_row = row_count + 1
            ws.Range(f"A{next_row}").Value = "1042"
            ws.Range(f"B{next_row}").Value = "TechSupply Co."
            ws.Range(f"C{next_row}").Value = "4500"
            ws.Range(f"D{next_row}").Value = "Pending"
            
            # Flash yellow to show it updated
            ws.Range(f"A{next_row}:D{next_row}").Interior.ColorIndex = 36
            
            excel.ActiveWorkbook.Save()
            return {"success": True, "message": "Updated Excel and saved."}
            
        else:
            return {"success": False, "error": f"Unknown action {action}"}
            
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Missing action argument"}))
        sys.exit(1)
        
    action = sys.argv[1]
    target = sys.argv[2] if len(sys.argv) > 2 else None
    value = sys.argv[3] if len(sys.argv) > 3 else None
    
    result = execute_action(action, target, value)
    print(json.dumps(result))
