# NUMERIA — extrait pédagogique gratuit
# Un neurone, sans boîte noire
# Jeu pédagogique, pas une collection complète.
# Pour x = 2, w = 1, b = 0 et une cible de 5, calculez la perte L = ½(y − cible)² puis dL/dw.

x, w, b, cible = 2.0, 1.0, 0.0, 5.0
y = w * x + b
loss = 0.5 * (y - cible) ** 2
grad_w = (y - cible) * x
w_next = w - 0.1 * grad_w
print(loss, grad_w, w_next)  # 4.5, -6.0, 1.6
