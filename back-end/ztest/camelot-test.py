import camelot

PDF="resume-guide.pdf"

for mode in [
    "stream",
    "lattice"
]:

    print(
        "\nMODE:",
        mode
    )

    tables=camelot.read_pdf(
        PDF,
        pages="all",
        flavor=mode
    )

    print(
        "detected:",
        tables.n
    )

    for i,table in enumerate(tables):

        print(
            f"\nTable {i}"
        )

        print(
            table.df.head()
        )

        print(
            table.parsing_report
        )