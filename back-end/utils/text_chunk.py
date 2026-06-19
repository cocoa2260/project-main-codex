from langchain_text_splitters import (
    RecursiveCharacterTextSplitter
)

def split_text(
    text: str,
    size: int = 1000,
):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=size,
        chunk_overlap=size * 0.2,
    )

    return splitter.split_text(text)
