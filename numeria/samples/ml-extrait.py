# NUMERIA — extrait pédagogique gratuit
# Le test ne doit pas enseigner au modèle
# Jeu pédagogique, pas une collection complète.
# Calculez la prédiction uniquement sur train. Mesurez ensuite l’erreur absolue moyenne sur test. Pourquoi ne faut-il pas inclure test dans le calcul de la moyenne ?

from statistics import mean

train = [8, 10, 12, 14]
test = [9, 13]
prediction = mean(train)
mae = mean(abs(y - prediction) for y in test)
print(prediction, mae)  # 11, 2
