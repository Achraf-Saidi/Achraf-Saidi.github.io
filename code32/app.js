'use strict';
(() => {
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const email = 'achrafsai.di@outlook.com';
  $('#year').textContent = new Date().getFullYear();

  const menu = $('.menu-button');
  const navigation = $('#navigation');
  function closeMenu() { navigation.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', 'Ouvrir le menu'); }
  menu.addEventListener('click', () => { const open = navigation.classList.toggle('open'); menu.setAttribute('aria-expanded', String(open)); menu.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu'); });
  $$('#navigation a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });

  const audiences = {
    secondary: { math: 'Algèbre, fonctions, trigonométrie, dérivées et probabilités. On remet les bases à leur place pour aborder la suite.', mathTags: ['Remise à niveau', 'Préparation aux examens'], physics: 'Mécanique, énergie et électricité. On relie les formules à une situation concrète, puis on apprend à poser le problème.', physicsLevel: '4e → 6e secondaire', code: 'Python, logique et premiers projets. Comprendre son programme, trouver les erreurs et construire quelque chose soi-même.', codeLevel: 'Débutants & curieux', codeTags: ['Python', 'Mini-projets'], mathLevel: '4e → 6e secondaire', footnote: 'Pour le secondaire francophone belge. Le contenu est adapté à l’année, à l’option et aux supports de l’élève.' },
    higher: { math: 'Analyse, algèbre linéaire, probabilités et statistiques. On reprend les notions du cours et on travaille le raisonnement attendu à l’examen.', mathTags: ['Début de bachelier', 'Maths & statistiques'], physics: 'Les bases de mécanique, les unités et la résolution de problèmes. Un accompagnement à préciser selon le syllabus et les exercices du cours.', physicsLevel: 'Début de bachelier', code: 'Python, R, manipulation de données et débogage. Apprendre à expliquer son code et à résoudre les exercices sans copier une solution.', codeLevel: 'Python & R', codeTags: ['Travaux pratiques', 'Analyse de données'], mathLevel: 'Début de bachelier', footnote: 'Pour les étudiants du début du supérieur. La compatibilité avec votre cours est vérifiée avant de proposer un accompagnement.' }
  };
  function setTags(target, values) { target.replaceChildren(...values.map(value => { const span = document.createElement('span'); span.textContent = value; return span; })); }
  $$('[data-audience]').forEach(button => button.addEventListener('click', () => {
    const current = audiences[button.dataset.audience];
    $$('[data-audience]').forEach(other => { const selected = other === button; other.classList.toggle('active', selected); other.setAttribute('aria-pressed', String(selected)); });
    $('#math-copy').textContent = current.math; $('#physics-copy').textContent = current.physics; $('#code-copy').textContent = current.code;
    $('.math .course-number span').textContent = current.mathLevel; $('#physics-level').textContent = current.physicsLevel; $('#code-level').textContent = current.codeLevel;
    setTags($('#math-chips'), current.mathTags); setTags($('#code-chips'), current.codeTags); $('#course-footnote').textContent = current.footnote;
  }));

  const exercises = {
    math: { level: 'Fonctions · Secondaire', question: 'Quels sont les zéros de f(x) = x² − 4 ?', options: ['0 et 4', '−2 et 2', '2 et 4'], correct: 1, hints: ['Un zéro de la fonction est une valeur de x pour laquelle f(x) = 0. Écrivez donc x² − 4 = 0.', 'L’équation devient x² = 4. Quel nombre positif ET quel nombre négatif ont pour carré 4 ?', '2² = 4 et (−2)² = 4. Testez les deux valeurs dans x² − 4.'], success: 'Exact ! (−2)² − 4 = 0 et 2² − 4 = 0. Il y a deux zéros : −2 et 2.', retry: 'Pas encore. Un zéro est une valeur de x qui donne f(x) = 0. Essayez de remplacer x par vos deux nombres, ou demandez un indice.' },
    physics: { level: 'Mouvement · Secondaire', question: 'À 5 m/s pendant 8 secondes, quelle distance parcourt-on ?', options: ['13 mètres', '40 mètres', '1,6 mètre'], correct: 1, hints: ['La vitesse est constante. Chaque seconde, on parcourt 5 mètres.', 'Après 8 secondes, on a parcouru 8 fois cette distance. La relation est d = v × t.', 'Calculez 5 × 8. Les unités donnent (m/s) × s = m.'], success: 'Oui ! d = v × t = 5 m/s × 8 s = 40 m. Les secondes se simplifient : le résultat est bien une distance.', retry: 'Reprenons la situation : 5 mètres sont parcourus chaque seconde, pendant 8 secondes. Faut-il additionner, diviser ou multiplier ?' },
    python: { level: 'Boucles · Python', question: 'Que va afficher ce programme ?', code: 'total = 0\nfor i in range(1, 4):\n    total += i\nprint(total)', options: ['4', '6', '10'], correct: 1, hints: ['En Python, range(1, 4) produit 1, 2 et 3. La borne de fin, 4, est exclue.', 'À chaque passage dans la boucle, total += i ajoute la valeur de i à total.', 'Suivez total : 0 → 1 → 3 → 6. Quel est le nombre affiché à la fin ?'], success: 'Exact ! Le programme calcule 1 + 2 + 3 = 6. range(1, 4) exclut la borne finale 4.', retry: 'Vérifiez les valeurs parcourues : range(1, 4) ne comprend pas 4. Suivez ensuite total après chaque passage dans la boucle.' }
  };
  let exerciseKey = 'math';
  let hintIndex = 0;
  function renderExercise(key) {
    exerciseKey = key; hintIndex = 0; const exercise = exercises[key];
    $$('[data-demo]').forEach(button => { const selected = button.dataset.demo === key; button.classList.toggle('active', selected); button.setAttribute('aria-pressed', String(selected)); });
    $('#demo-level').textContent = exercise.level; $('#demo-question').textContent = exercise.question;
    $('#demo-code').hidden = !exercise.code; $('#demo-code code').textContent = exercise.code || '';
    $('#demo-feedback').hidden = true; $('#demo-feedback').classList.remove('retry'); $('#hint-box').hidden = true;
    $('#hint-button').textContent = 'Un indice, s’il vous plaît'; $('#hint-button').disabled = false;
    $('#answers').replaceChildren(...exercise.options.map((option, index) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'answer-option';
      const letter = document.createElement('span'); letter.className = 'answer-letter'; letter.setAttribute('aria-hidden', 'true'); letter.textContent = 'ABC'[index];
      const answer = document.createElement('span'); answer.textContent = option; button.append(letter, answer);
      button.addEventListener('click', () => {
        $$('.answer-option').forEach(other => { other.classList.remove('correct', 'incorrect'); other.removeAttribute('aria-pressed'); });
        const correct = index === exercise.correct; button.classList.add(correct ? 'correct' : 'incorrect'); button.setAttribute('aria-pressed', 'true');
        $('#demo-feedback').textContent = correct ? exercise.success : exercise.retry; $('#demo-feedback').classList.toggle('retry', !correct); $('#demo-feedback').hidden = false;
      }); return button;
    }));
  }
  $$('[data-demo]').forEach(button => button.addEventListener('click', () => renderExercise(button.dataset.demo)));
  $('#hint-button').addEventListener('click', () => {
    const hints = exercises[exerciseKey].hints;
    $('#hint-box').textContent = `Indice ${hintIndex + 1} / ${hints.length} · ${hints[hintIndex]}`; $('#hint-box').hidden = false; hintIndex++;
    $('#hint-button').textContent = hintIndex < hints.length ? 'Un autre indice' : 'Tous les indices affichés'; $('#hint-button').disabled = hintIndex >= hints.length;
  });
  $('#reset-demo').addEventListener('click', () => renderExercise(exerciseKey)); renderExercise('math');

  $$('[data-interest]').forEach(link => link.addEventListener('click', () => { $('#contact-subject').value = link.dataset.interest; }));
  $$('[data-plan]').forEach(link => link.addEventListener('click', () => { $('#contact-plan').value = link.dataset.plan; }));
  const form = $('#contact-form'); let preparedMessage = '';
  form.addEventListener('submit', event => {
    event.preventDefault(); if (!form.reportValidity()) return;
    const data = new FormData(form); const subject = `Code32 — Premier échange — ${data.get('subject')}`;
    preparedMessage = `Bonjour Achraf,\n\nJe souhaite un premier échange gratuit pour découvrir Code32.\n\nPrénom : ${String(data.get('name')).trim()}\nJe suis : ${data.get('role')}\nE-mail de réponse : ${String(data.get('email')).trim()}\nMatière : ${data.get('subject')}\nFormule : ${data.get('plan')}\n\nMon objectif :\n${String(data.get('goal')).trim()}\n\nMerci et à bientôt.`;
    $('#email-body').textContent = preparedMessage;
    $('#send-email').href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(preparedMessage)}`;
    form.hidden = true; $('#email-preview').hidden = false; $('#copy-status').textContent = ''; $('#send-email').focus({preventScroll:true});
  });
  $('#edit-email').addEventListener('click', () => { $('#email-preview').hidden = true; form.hidden = false; form.querySelector('input[name="name"]').focus({preventScroll:true}); });
  $('#copy-email').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(`À : ${email}\n\n${preparedMessage}`); $('#copy-status').textContent = 'Message copié. Collez-le dans votre messagerie pour l’envoyer.'; }
    catch { const range = document.createRange(); range.selectNodeContents($('#email-body')); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); $('#copy-status').textContent = 'Le message est sélectionné. Vous pouvez le copier puis le coller dans votre messagerie.'; }
  });

  const policies = {
    privacy: { title: 'Confidentialité', sections: [['Un site de présentation', 'Le site Code32 ne crée pas de compte, ne conserve pas les réponses à la démonstration et n’utilise ni outil d’analyse publicitaire ni cookie applicatif.'], ['Votre demande de contact', 'Les informations saisies restent dans cette page jusqu’à sa fermeture. Le bouton prépare un e-mail dans votre messagerie. Aucun message n’est envoyé automatiquement et aucune demande n’est enregistrée dans une base de données par ce site.'], ['Services extérieurs', 'GitHub Pages héberge le site. Google Fonts fournit les polices et GitHub fournit le portrait public du fondateur. Ces services peuvent recevoir votre adresse IP et les données techniques nécessaires au chargement. Les liens vers LinkedIn et votre messagerie relèvent de leurs propres conditions.'], ['Échanges par e-mail', 'Si vous envoyez un message, Achraf reçoit les informations que vous choisissez de transmettre afin de répondre à votre demande. Pour une question ou une demande de suppression concernant ces échanges, écrivez à achrafsai.di@outlook.com. Évitez toute donnée sensible ou le dossier scolaire complet d’un mineur.']] },
    legal: { title: 'Informations sur le projet', sections: [['Code32', 'Code32 est un projet d’accompagnement éducatif indépendant en préparation, porté par Achraf Saidi en Belgique. Contact : achrafsai.di@outlook.com.'], ['Statut du lancement', 'Ce site présente l’approche et recueille l’intérêt pour de futurs cours. Aucun paiement, achat, contrat ou réservation définitive n’est réalisé sur le site. Les tarifs affichés sont des tarifs de lancement envisagés.'], ['Avant toute réservation', 'Le prestataire, les informations légales applicables, le prix final, les modalités et les disponibilités seront communiqués avant toute réservation ferme. Le site n’affirme pas qu’un centre physique ou un espace IA personnalisé est déjà ouvert.'], ['Indépendance', 'Le parcours académique du fondateur est présenté à titre biographique. Code32 n’est ni affilié ni soutenu officiellement par l’UCLouvain.'], ['Hébergement', 'Le site est hébergé sur GitHub Pages, un service de GitHub, Inc. Les illustrations mathématiques et les exercices sont des exemples pédagogiques.']] }
  };
  const dialog = $('#legal-dialog');
  $$('[data-legal]').forEach(button => button.addEventListener('click', () => {
    const policy = policies[button.dataset.legal]; $('#legal-title').textContent = policy.title;
    $('#legal-content').replaceChildren(...policy.sections.flatMap(([title, text]) => { const h = document.createElement('h3'); h.textContent = title; const p = document.createElement('p'); p.textContent = text; return [h,p]; }));
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
  }));
  $$('.dialog-close').forEach(button => button.addEventListener('click', () => { if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open'); }));
  dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
})();
