
try:
    with open(r'g:\TASKMANAGER\mini_proj\client\src\pages\TaskDetails.jsx', 'rb') as f:
        content = f.read()
        # Find line 25
        lines = content.split(b'\n')
        if len(lines) >= 25:
            line_25 = lines[24] # 0-indexed, so 24 is line 25
            print(f"Line 25 repr: {line_25}")
            print(f"Line 25 decoded: {line_25.decode('utf-8', errors='replace')}")
            # Check for strange bytes
            for b in line_25:
                if b > 127 or b < 32:
                     print(f"Byte: {b} (Hex: {hex(b)})")
except Exception as e:
    print(e)
