from sentence_transformers import SentenceTransformer
from peft import PeftModel


def load_merged_model(
    base_model_name: str,
    # adapter_path: str
):
    # base 모델 호출
    model = SentenceTransformer(
        base_model_name
    )

    base_transformer = (
        model[0].auto_model
    )

    # Lora adapter 추가
    peft_model = PeftModel.from_pretrained(
        base_transformer,
        # adapter_path,
        is_trainable=True,
    )

    merged_model = (
        peft_model.merge_and_unload()
    )

    model[0].auto_model = merged_model

    return model