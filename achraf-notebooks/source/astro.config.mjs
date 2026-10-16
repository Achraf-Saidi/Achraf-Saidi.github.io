import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
export default defineConfig({
 site: 'https://achraf-saidi.github.io', base: process.env.BASE_PATH || '/achraf-notebooks', trailingSlash: 'always',
 integrations: [starlight({
  title: 'Achraf Notebooks', description: 'An open learning library for mathematics, statistics and artificial intelligence. By Achraf Saidi.',
  defaultLocale: 'fr', locales: {fr: {label:'Français',lang:'fr'},en:{label:'English',lang:'en'}},
  logo: {src:'./src/assets/logo.svg', replacesTitle:false},
  social: [{icon:'github',label:'GitHub',href:'https://github.com/Achraf-Saidi/Achraf-Saidi.github.io/tree/main/achraf-notebooks'}],
  customCss: ['./src/styles/custom.css','katex/dist/katex.min.css'],
  components: {Hero:'./src/components/Hero.astro',Footer:'./src/components/Footer.astro'},
  sidebar: [
   {label:'Votre bibliothèque',translations:{en:'Your library'},items:[
    {label:'Parcours & catalogue',translations:{en:'Paths & catalogue'},slug:'curriculum'},
    {label:'Où commencer ?',translations:{en:'Where to start?'},slug:'start'},
    {label:'Mon carnet',translations:{en:'My notebook'},slug:'notebook'},
    {label:'Laboratoires',translations:{en:'Laboratories'},slug:'labs'}]},
   {label:'01 · Fondations mathématiques',translations:{en:'01 · Mathematical foundations'},autogenerate:{directory:'foundations'}},
   {label:'02 · Probabilités & algèbre',translations:{en:'02 · Probability & algebra'},autogenerate:{directory:'mathematics'}},
   {label:'03 · Programmation scientifique',translations:{en:'03 · Scientific programming'},autogenerate:{directory:'programming'}},
   {label:'04 · Apprentissage',translations:{en:'04 · Learning'},autogenerate:{directory:'learning'}},
   {label:'05 · Recherche & biologie',translations:{en:'05 · Research & biology'},autogenerate:{directory:'research'}},
   {label:'Explorer',translations:{en:'Explore'},items:[
    {label:'Projets reproductibles',translations:{en:'Reproducible projects'},slug:'projects'},
    {label:'Glossaire',translations:{en:'Glossary'},slug:'glossary'},
    {label:'Histoire & références',translations:{en:'History & references'},slug:'references'},
    {label:'À propos & avancement',translations:{en:'About & progress'},slug:'about'}]}
  ]
 })], markdown:{remarkPlugins:[remarkMath],rehypePlugins:[[rehypeKatex,{throwOnError:true}]]}
});
