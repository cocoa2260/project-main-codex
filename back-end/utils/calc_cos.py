import numpy as np

def calc_cos_score(rows, embedding):
    query_vec = np.array(embedding, dtype=np.float32)
    query_norm = np.linalg.norm(query_vec)

    scored = []

    for chunk_id, emb in rows:
        emb_vec = np.array(emb, dtype=np.float32)

        denom = query_norm * np.linalg.norm(emb_vec)
        if denom == 0:
            similarity = 0.0
        else:
            similarity = np.dot(query_vec, emb_vec) / denom

        scored.append((similarity, chunk_id))

    return scored