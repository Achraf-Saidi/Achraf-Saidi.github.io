scores <- data.frame(
  group = c("A", "A", "B", "B"),
  score = c(10, 14, 8, 12)
)
print(scores)
print(tapply(scores$score, scores$group, mean))
stopifnot(mean(scores$score) == 11)
