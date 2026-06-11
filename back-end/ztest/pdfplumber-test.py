import pdfplumber

PDF_PATH="resume-guide.pdf"

with pdfplumber.open(PDF_PATH) as pdf:
    '''
    for page_num, page in enumerate(pdf.pages):
        print(f"\n===== PAGE {page_num+1} =====")
        words = page.extract_words()
        for word in words:
            print(word)
    '''
    '''
    for page_idx,page in enumerate(pdf.pages):
        print(f"\nPAGE {page_idx+1}")

        words=page.extract_words()

        for w in words:
            print(f"text={w['text']:15}" f"x0={w['x0']:8.1f}" f"top={w['top']:8.1f}" f"x1={w['x1']:8.1f}" f"bottom={w['bottom']:8.1f}")
    '''
            
    for page_idx,page in enumerate(pdf.pages):
        print(f"\nPAGE {page_idx+1}")

        words=page.extract_words()
        rows = {}
        threshold = 5

        for word in words:
            # print(f"\nWORD: {word['top']}")
            y = round(word["top"]/threshold) * threshold

            rows.setdefault(y, []).append(word)

        for y,row in rows.items():
            print(f"\nROW:{y}, WORD: {word['top']}")

            row=sorted(row, key=lambda x:x["x0"])

            print([w["text"] for w in row])
    
    '''
        for row in rows.values():
            if len(row)>=3:
                print("TABLE CANDIDATE")
            else:
                print("PARAGRAPH")
    '''