# NUMERIA — extrait pédagogique gratuit
# Une mise à jour de Q-learning
# Jeu pédagogique, pas une collection complète.
# Avec Q = 0, α = 0,5, γ = 0,9, récompense = 1 et max Q suivant = 2, calculez la nouvelle valeur. Puis refaites le calcul si la transition termine l’épisode.

def update(q, reward, next_max, terminal=False):
    alpha, gamma = 0.5, 0.9
    target = reward if terminal else reward + gamma * next_max
    return q + alpha * (target - q)

print(update(0, 1, 2))        # 1.4
print(update(0, 1, 2, True))  # 0.5
