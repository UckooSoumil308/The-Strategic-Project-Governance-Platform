import json

def loosen_prompt(notebook_path):
    with open(notebook_path, 'r', encoding='utf-8') as f:
        nb = json.load(f)

    for cell in nb['cells']:
        if cell['cell_type'] == 'code':
            source_lines = cell['source']
            for i, line in enumerate(source_lines):
                if "'2. If the task is clearly unrelated, addresses a different goal, or would '\\n'" in line:
                    source_lines[i] = "        '2. Err on the side of APPROVAL. Even if a task is not explicitly mentioned in the OKRs, if it appears to be a reasonable step in a project timeline, set approved to true.\\\\n'\\n"
                elif "'cause strategic drift, set approved to false.\\n'" in line:
                    source_lines[i] = "        '3. Only if the task is egregiously unrelated or explicitly forbidden, set approved to false.\\\\n'\\n"
                elif "'3. If the task supports, enables, or directly contributes to any OKR, '\\n'" in line:
                     source_lines[i] = ""
                elif "'set approved to true.\\n'" in line:
                     source_lines[i] = ""

    with open(notebook_path, 'w', encoding='utf-8') as f:
        json.dump(nb, f)

loosen_prompt('Colab_Judge_Agent.ipynb')
loosen_prompt('Local_Judge_Agent.ipynb')
