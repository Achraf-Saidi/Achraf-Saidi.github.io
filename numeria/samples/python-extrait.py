# NUMERIA — extrait pédagogique gratuit
# Une moyenne qui refuse les mauvaises données
# Jeu pédagogique, pas une collection complète.
# Écrivez une fonction qui calcule la moyenne de notes entre 0 et 20. Elle doit refuser une liste vide, les booléens et une note hors intervalle.

def moyenne(notes):
    if not notes:
        raise ValueError("Liste vide")
    if any(type(n) not in (int, float)
           or not 0 <= n <= 20 for n in notes):
        raise ValueError("Note invalide")
    return sum(notes) / len(notes)

assert moyenne([12, 16, 14]) == 14

for invalid in ([], [True], [21], [float("nan")]):
    try:
        moyenne(invalid)
    except ValueError:
        pass
    else:
        raise AssertionError("Une entrée invalide a été acceptée")
print("Extrait Python : vérifications réussies")
