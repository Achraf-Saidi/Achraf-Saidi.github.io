# NUMERIA — extrait pédagogique gratuit
# Observer avant de conclure
# Jeu pédagogique, pas une collection complète.
# Calculez la moyenne, la médiane et l’écart-type. Tracez les observations. Que peut-on conclure — et que ne peut-on pas conclure — avec dix notes fictives ?

notes <- c(8, 11, 12, 12, 13, 14, 14, 15, 17, 18)
mean(notes)
median(notes)
sd(notes)
plot(seq_along(notes), notes, pch = 19,
     xlab = "Observation", ylab = "Note / 20")
