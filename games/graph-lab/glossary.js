/* Graph Lab — Word help glossary. Teacher: edit words here. */
window.GRAPH_LAB_GLOSSARY = {
  languages: [
    { code: "es", name: "Español", english: "Spanish", dir: "ltr", speech: "es-ES" },
    { code: "ar", name: "العربية", english: "Arabic", dir: "rtl", speech: "ar-SA" },
    { code: "prs", name: "دری", english: "Dari", dir: "rtl", speech: "fa-AF" },
    { code: "fr", name: "Français", english: "French", dir: "ltr", speech: "fr-FR" },
    { code: "tl", name: "Tagalog", english: "Tagalog", dir: "ltr", speech: "fil-PH" },
    { code: "af", name: "Afrikaans", english: "Afrikaans", dir: "ltr", speech: "af-ZA" }
  ],
  terms: [
    { id: "axis", group: "graph", en: "axis", def: "A line on a graph with numbers on it.",
      tr: {
        es: { word: "eje", def: "Una línea del gráfico con números." },
        ar: { word: "محور", def: "خط في الرسم البياني عليه أرقام." },
        prs: { word: "محور", def: "یک خط در گراف که اعداد دارد." },
        fr: { word: "axe", def: "Une ligne du graphique avec des nombres." },
        tl: { word: "aksis (axis)", def: "Isang linya sa graph na may mga numero." },
        af: { word: "as", def: "'n Lyn op 'n grafiek met getalle." }
      } },
    { id: "x-axis", group: "graph", en: "x-axis", def: "The line across the bottom of the graph. →",
      tr: {
        es: { word: "eje x", def: "La línea de abajo del gráfico. →" },
        ar: { word: "المحور السيني (محور x)", def: "الخط في أسفل الرسم البياني. →" },
        prs: { word: "محور x (محور افقی)", def: "خطی که در پایین گراف است. →" },
        fr: { word: "axe des abscisses (axe x)", def: "La ligne en bas du graphique. →" },
        tl: { word: "x-axis (aksis x)", def: "Ang linya sa ibaba ng graph. →" },
        af: { word: "x-as", def: "Die lyn onder aan die grafiek. →" }
      } },
    { id: "y-axis", group: "graph", en: "y-axis", def: "The line up the side of the graph. ↑",
      tr: {
        es: { word: "eje y", def: "La línea del lado del gráfico. ↑" },
        ar: { word: "المحور الصادي (محور y)", def: "الخط على جانب الرسم البياني. ↑" },
        prs: { word: "محور y (محور عمودی)", def: "خطی که در کنار گراف است. ↑" },
        fr: { word: "axe des ordonnées (axe y)", def: "La ligne sur le côté du graphique. ↑" },
        tl: { word: "y-axis (aksis y)", def: "Ang linya sa gilid ng graph. ↑" },
        af: { word: "y-as", def: "Die lyn langs die kant van die grafiek. ↑" }
      } },
    { id: "graph", group: "graph", en: "graph", def: "A picture that shows numbers.",
      tr: {
        es: { word: "gráfico (gráfica)", def: "Un dibujo que muestra números." },
        ar: { word: "رسم بياني", def: "صورة تُظهر الأرقام." },
        prs: { word: "گراف (نمودار)", def: "تصویری که اعداد را نشان می‌دهد." },
        fr: { word: "graphique", def: "Un dessin qui montre des nombres." },
        tl: { word: "graph", def: "Larawang nagpapakita ng mga numero." },
        af: { word: "grafiek", def: "'n Prentjie wat getalle wys." }
      } },
    { id: "title", group: "graph", en: "title", def: "The name at the top of the graph.",
      tr: {
        es: { word: "título", def: "El nombre de arriba del gráfico." },
        ar: { word: "العنوان", def: "الاسم في أعلى الرسم البياني." },
        prs: { word: "عنوان", def: "نام بالای گراف." },
        fr: { word: "titre", def: "Le nom en haut du graphique." },
        tl: { word: "pamagat", def: "Ang pangalan sa itaas ng graph." },
        af: { word: "titel", def: "Die naam bo-aan die grafiek." }
      } },
    { id: "label", group: "graph", en: "label", def: "Words that tell what something is.",
      tr: {
        es: { word: "etiqueta", def: "Palabras que dicen qué es algo." },
        ar: { word: "تسمية", def: "كلمات تقول ما هو الشيء." },
        prs: { word: "برچسب", def: "کلماتی که می‌گوید چیزی چیست." },
        fr: { word: "étiquette", def: "Des mots qui disent ce que c'est." },
        tl: { word: "label (tatak)", def: "Mga salitang nagsasabi kung ano ang isang bagay." },
        af: { word: "etiket", def: "Woorde wat sê wat iets is." }
      } },
    { id: "unit", group: "graph", en: "unit", def: "The word for how you measure, like cm.",
      tr: {
        es: { word: "unidad", def: "La palabra que dice cómo mides, como cm." },
        ar: { word: "وحدة", def: "الكلمة التي تقول كيف تقيس، مثل سم." },
        prs: { word: "واحد", def: "کلمه‌ای که می‌گوید چطور اندازه می‌کنید، مثل سانتی‌متر." },
        fr: { word: "unité", def: "Le mot qui dit comment on mesure, comme cm." },
        tl: { word: "yunit (unit)", def: "Salitang nagsasabi kung paano ka sumusukat, tulad ng cm." },
        af: { word: "eenheid", def: "Die woord wat sê hoe jy meet, soos cm." }
      } },
    { id: "scale", group: "graph", en: "scale", def: "The numbers on each axis, with the same jump.",
      tr: {
        es: { word: "escala", def: "Los números de cada eje, con el mismo salto." },
        ar: { word: "مقياس الرسم", def: "الأرقام على كل محور، بالقفزة نفسها." },
        prs: { word: "مقیاس", def: "اعداد روی هر محور، با فاصلهٔ یکسان." },
        fr: { word: "échelle", def: "Les nombres sur chaque axe, avec le même écart." },
        tl: { word: "iskala (scale)", def: "Ang mga numero sa bawat axis, na may parehong pagitan." },
        af: { word: "skaal", def: "Die getalle op elke as, met dieselfde sprong." }
      } },
    { id: "count-by", group: "graph", en: "count by", def: "The same jump between numbers, like 0, 5, 10.",
      tr: {
        es: { word: "contar de ... en ...", def: "El mismo salto entre números, como 0, 5, 10." },
        ar: { word: "العدّ بخطوة ثابتة", def: "القفزة نفسها بين الأرقام، مثل 0، 5، 10." },
        prs: { word: "شمارش با فاصلهٔ ثابت", def: "فاصلهٔ یکسان بین اعداد، مثل 0، 5، 10." },
        fr: { word: "compter de ... en ...", def: "Le même écart entre les nombres, comme 0, 5, 10." },
        tl: { word: "bilang na may pagitan", def: "Parehong pagitan ng mga numero, tulad ng 0, 5, 10." },
        af: { word: "tel in spronge (interval)", def: "Dieselfde sprong tussen getalle, soos 0, 5, 10." }
      } },
    { id: "plot", group: "graph", en: "plot", def: "To put a dot on the graph.",
      tr: {
        es: { word: "graficar", def: "Poner un punto en el gráfico." },
        ar: { word: "رسم النقاط (التمثيل البياني)", def: "وضع نقطة على الرسم البياني." },
        prs: { word: "ترسیم کردن", def: "یک نقطه روی گراف گذاشتن." },
        fr: { word: "tracer", def: "Mettre un point sur le graphique." },
        tl: { word: "mag-plot", def: "Maglagay ng tuldok sa graph." },
        af: { word: "plot (stip)", def: "Sit 'n kolletjie op die grafiek." }
      } },
    { id: "point", group: "graph", en: "point", def: "One dot on the graph.",
      tr: {
        es: { word: "punto", def: "Un punto en el gráfico." },
        ar: { word: "نقطة", def: "نقطة واحدة على الرسم البياني." },
        prs: { word: "نقطه", def: "یک نقطه روی گراف." },
        fr: { word: "point", def: "Un point sur le graphique." },
        tl: { word: "tuldok (point)", def: "Isang tuldok sa graph." },
        af: { word: "punt", def: "Een kolletjie op die grafiek." }
      } },
    { id: "line", group: "graph", en: "line", def: "A line that follows or joins the dots.",
      tr: {
        es: { word: "línea", def: "Una línea que sigue o une los puntos." },
        ar: { word: "خط", def: "خط يتبع النقاط أو يصل بينها." },
        prs: { word: "خط", def: "خطی که نقطه‌ها را دنبال یا وصل می‌کند." },
        fr: { word: "ligne", def: "Une ligne qui suit ou relie les points." },
        tl: { word: "linya", def: "Linyang sumusunod o nag-uugnay sa mga tuldok." },
        af: { word: "lyn", def: "'n Lyn wat die punte volg of verbind." }
      } },
    { id: "legend", group: "graph", en: "legend", def: "A box that tells what each color means.",
      tr: {
        es: { word: "leyenda", def: "Un cuadro que dice qué significa cada color." },
        ar: { word: "مفتاح الرسم (دليل الألوان)", def: "مربع يقول ماذا يعني كل لون." },
        prs: { word: "راهنمای رنگ‌ها (لیجند)", def: "جعبه‌ای که می‌گوید هر رنگ چه معنی دارد." },
        fr: { word: "légende", def: "Une boîte qui dit ce que chaque couleur veut dire." },
        tl: { word: "legend (susi)", def: "Kahon na nagsasabi kung ano ang ibig sabihin ng bawat kulay." },
        af: { word: "legende", def: "'n Blokkie wat sê wat elke kleur beteken." }
      } },
    { id: "data", group: "graph", en: "data", def: "Numbers you collect in an experiment.",
      tr: {
        es: { word: "datos", def: "Números que reúnes en un experimento." },
        ar: { word: "بيانات", def: "أرقام تجمعها في تجربة." },
        prs: { word: "معلومات (داده‌ها)", def: "اعدادی که در تجربه جمع می‌کنید." },
        fr: { word: "données", def: "Des nombres que tu recueilles dans une expérience." },
        tl: { word: "datos (data)", def: "Mga numerong kinokolekta mo sa eksperimento." },
        af: { word: "data", def: "Getalle wat jy in 'n eksperiment versamel." }
      } },
    { id: "data-table", group: "graph", en: "data table", def: "A chart with rows and columns of numbers.",
      tr: {
        es: { word: "tabla de datos", def: "Un cuadro con filas y columnas de números." },
        ar: { word: "جدول البيانات", def: "جدول فيه صفوف وأعمدة من الأرقام." },
        prs: { word: "جدول معلومات", def: "جدولی با سطرها و ستون‌های اعداد." },
        fr: { word: "tableau de données", def: "Un tableau avec des lignes et des colonnes de nombres." },
        tl: { word: "talaan ng datos", def: "Tsart na may mga hanay at kolum ng numero." },
        af: { word: "datatabel", def: "'n Tabel met rye en kolomme getalle." }
      } },
    { id: "variable", group: "graph", en: "variable", def: "Something that can change in an experiment.",
      tr: {
        es: { word: "variable", def: "Algo que puede cambiar en un experimento." },
        ar: { word: "متغير", def: "شيء يمكن أن يتغير في التجربة." },
        prs: { word: "متغیر", def: "چیزی که در تجربه می‌تواند تغییر کند." },
        fr: { word: "variable", def: "Quelque chose qui peut changer dans une expérience." },
        tl: { word: "baryabol (variable)", def: "Bagay na puwedeng magbago sa eksperimento." },
        af: { word: "veranderlike", def: "Iets wat in 'n eksperiment kan verander." }
      } },
    { id: "independent-variable", group: "graph", en: "independent variable", def: "The thing you change in the experiment.",
      tr: {
        es: { word: "variable independiente", def: "Lo que tú cambias en el experimento." },
        ar: { word: "المتغير المستقل", def: "الشيء الذي تغيّره في التجربة." },
        prs: { word: "متغیر مستقل", def: "چیزی که شما در تجربه تغییر می‌دهید." },
        fr: { word: "variable indépendante", def: "Ce que tu changes dans l'expérience." },
        tl: { word: "malayang baryabol", def: "Ang binabago mo sa eksperimento." },
        af: { word: "onafhanklike veranderlike", def: "Die ding wat jy in die eksperiment verander." }
      } },
    { id: "dependent-variable", group: "graph", en: "dependent variable", def: "The thing you measure in the experiment.",
      tr: {
        es: { word: "variable dependiente", def: "Lo que tú mides en el experimento." },
        ar: { word: "المتغير التابع", def: "الشيء الذي تقيسه في التجربة." },
        prs: { word: "متغیر وابسته", def: "چیزی که شما در تجربه اندازه می‌کنید." },
        fr: { word: "variable dépendante", def: "Ce que tu mesures dans l'expérience." },
        tl: { word: "nakasalalay na baryabol", def: "Ang sinusukat mo sa eksperimento." },
        af: { word: "afhanklike veranderlike", def: "Die ding wat jy in die eksperiment meet." }
      } },
    { id: "measure", group: "lab", en: "measure", def: "To find how big, long, or hot something is.",
      tr: {
        es: { word: "medir", def: "Saber qué tan grande, largo o caliente es algo." },
        ar: { word: "يقيس", def: "أن تعرف كم هو الشيء كبير أو طويل أو ساخن." },
        prs: { word: "اندازه کردن", def: "پیدا کردن اینکه چیزی چقدر بزرگ، دراز یا گرم است." },
        fr: { word: "mesurer", def: "Trouver si une chose est grande, longue ou chaude." },
        tl: { word: "sukatin", def: "Alamin kung gaano kalaki, kahaba, o kainit ang isang bagay." },
        af: { word: "meet", def: "Vind uit hoe groot, lank of warm iets is." }
      } },
    { id: "ruler", group: "lab", en: "ruler", def: "A tool for measuring length.",
      tr: {
        es: { word: "regla", def: "Una herramienta para medir la longitud." },
        ar: { word: "مسطرة", def: "أداة لقياس الطول." },
        prs: { word: "مسطر (خط‌کش)", def: "وسیله‌ای برای اندازه کردن طول." },
        fr: { word: "règle", def: "Un outil pour mesurer la longueur." },
        tl: { word: "ruler (pinuno)", def: "Kagamitan para sukatin ang haba." },
        af: { word: "liniaal", def: "'n Gereedskap om lengte te meet." }
      } },
    { id: "thermometer", group: "lab", en: "thermometer", def: "A tool for measuring temperature.",
      tr: {
        es: { word: "termómetro", def: "Una herramienta para medir la temperatura." },
        ar: { word: "ميزان الحرارة (ترمومتر)", def: "أداة لقياس درجة الحرارة." },
        prs: { word: "ترمامتر (حرارت‌سنج)", def: "وسیله‌ای برای اندازه کردن حرارت." },
        fr: { word: "thermomètre", def: "Un outil pour mesurer la température." },
        tl: { word: "termometro", def: "Kagamitan para sukatin ang temperatura." },
        af: { word: "termometer", def: "'n Gereedskap om temperatuur te meet." }
      } },
    { id: "spring", group: "lab", en: "spring", def: "A coil of metal that can stretch.",
      tr: {
        es: { word: "resorte", def: "Un alambre enrollado que se puede estirar." },
        ar: { word: "نابض (زنبرك)", def: "سلك ملفوف يمكن أن يتمدد." },
        prs: { word: "فنر", def: "سیم پیچیده‌ای که کش می‌شود." },
        fr: { word: "ressort", def: "Un fil de métal enroulé qui peut s'étirer." },
        tl: { word: "spring (muwelye)", def: "Pinilipit na alambre na puwedeng iunat." },
        af: { word: "veer", def: "'n Opgerolde draad wat kan rek." }
      } },
    { id: "mass", group: "lab", en: "mass", def: "How much stuff is in an object.",
      tr: {
        es: { word: "masa", def: "Cuánta materia hay en un objeto." },
        ar: { word: "كتلة", def: "كمية المادة في الجسم." },
        prs: { word: "کتله (جرم)", def: "مقدار ماده در یک جسم." },
        fr: { word: "masse", def: "La quantité de matière dans un objet." },
        tl: { word: "masa (mass)", def: "Gaano karaming materya ang nasa isang bagay." },
        af: { word: "massa", def: "Hoeveel stof in 'n voorwerp is." }
      } },
    { id: "gram", group: "lab", en: "gram (g)", def: "A unit for mass. Symbol: g.",
      tr: {
        es: { word: "gramo (g)", def: "Una unidad de masa. Símbolo: g." },
        ar: { word: "غرام (g)", def: "وحدة للكتلة. الرمز: g." },
        prs: { word: "گرام (g)", def: "واحد کتله. نشانه: g." },
        fr: { word: "gramme (g)", def: "Une unité de masse. Symbole : g." },
        tl: { word: "gramo (g)", def: "Yunit ng masa. Simbolo: g." },
        af: { word: "gram (g)", def: "'n Eenheid van massa. Simbool: g." }
      } },
    { id: "stretch", group: "lab", en: "stretch", def: "To pull something to make it longer.",
      tr: {
        es: { word: "estirar", def: "Jalar algo para hacerlo más largo." },
        ar: { word: "يمدّ", def: "أن تسحب شيئًا ليصير أطول." },
        prs: { word: "کش کردن", def: "چیزی را بکشید تا درازتر شود." },
        fr: { word: "étirer", def: "Tirer sur quelque chose pour le rendre plus long." },
        tl: { word: "iunat", def: "Hilahin ang isang bagay para humaba." },
        af: { word: "rek", def: "Trek aan iets om dit langer te maak." }
      } },
    { id: "centimeter", group: "lab", en: "centimeter (cm)", def: "A unit for length. Symbol: cm.",
      tr: {
        es: { word: "centímetro (cm)", def: "Una unidad de longitud. Símbolo: cm." },
        ar: { word: "سنتيمتر (cm)", def: "وحدة للطول. الرمز: cm." },
        prs: { word: "سانتی‌متر (cm)", def: "واحد طول. نشانه: cm." },
        fr: { word: "centimètre (cm)", def: "Une unité de longueur. Symbole : cm." },
        tl: { word: "sentimetro (cm)", def: "Yunit ng haba. Simbolo: cm." },
        af: { word: "sentimeter (cm)", def: "'n Eenheid van lengte. Simbool: cm." }
      } },
    { id: "temperature", group: "lab", en: "temperature", def: "How hot or cold something is.",
      tr: {
        es: { word: "temperatura", def: "Qué tan caliente o frío está algo." },
        ar: { word: "درجة الحرارة", def: "كم الشيء ساخن أو بارد." },
        prs: { word: "حرارت (درجهٔ حرارت)", def: "چیزی چقدر گرم یا سرد است." },
        fr: { word: "température", def: "À quel point quelque chose est chaud ou froid." },
        tl: { word: "temperatura", def: "Gaano kainit o kalamig ang isang bagay." },
        af: { word: "temperatuur", def: "Hoe warm of koud iets is." }
      } },
    { id: "degree-celsius", group: "lab", en: "degree Celsius (°C)", def: "A unit for temperature. Symbol: °C.",
      tr: {
        es: { word: "grado Celsius (°C)", def: "Una unidad de temperatura. Símbolo: °C." },
        ar: { word: "درجة مئوية (°C)", def: "وحدة لدرجة الحرارة. الرمز: °C." },
        prs: { word: "درجه سانتی‌گراد (°C)", def: "واحد حرارت. نشانه: °C." },
        fr: { word: "degré Celsius (°C)", def: "Une unité de température. Symbole : °C." },
        tl: { word: "digri Celsius (°C)", def: "Yunit ng temperatura. Simbolo: °C." },
        af: { word: "graad Celsius (°C)", def: "'n Eenheid van temperatuur. Simbool: °C." }
      } },
    { id: "time", group: "lab", en: "time", def: "How long something takes.",
      tr: {
        es: { word: "tiempo", def: "Cuánto dura algo." },
        ar: { word: "الوقت", def: "كم يستغرق شيء ما." },
        prs: { word: "وقت", def: "چیزی چقدر وقت می‌گیرد." },
        fr: { word: "temps", def: "Combien de temps dure quelque chose." },
        tl: { word: "oras", def: "Gaano katagal ang isang bagay." },
        af: { word: "tyd", def: "Hoe lank iets neem." }
      } },
    { id: "minute", group: "lab", en: "minute (min)", def: "A unit for time. 60 seconds. Symbol: min.",
      tr: {
        es: { word: "minuto (min)", def: "Una unidad de tiempo. 60 segundos. Símbolo: min." },
        ar: { word: "دقيقة (min)", def: "وحدة للوقت. 60 ثانية. الرمز: min." },
        prs: { word: "دقیقه (min)", def: "واحد وقت. 60 ثانیه. نشانه: min." },
        fr: { word: "minute (min)", def: "Une unité de temps. 60 secondes. Symbole : min." },
        tl: { word: "minuto (min)", def: "Yunit ng oras. 60 segundo. Simbolo: min." },
        af: { word: "minuut (min)", def: "'n Eenheid van tyd. 60 sekondes. Simbool: min." }
      } },
    { id: "increase", group: "change", en: "increase", def: "To go up. To get bigger. ↑",
      tr: {
        es: { word: "aumentar", def: "Subir. Hacerse más grande. ↑" },
        ar: { word: "يزداد", def: "يصعد. يصير أكبر. ↑" },
        prs: { word: "زیاد شدن", def: "بالا رفتن. بزرگ‌تر شدن. ↑" },
        fr: { word: "augmenter", def: "Monter. Devenir plus grand. ↑" },
        tl: { word: "tumaas", def: "Umakyat. Lumaki. ↑" },
        af: { word: "toeneem", def: "Opgaan. Groter word. ↑" }
      } },
    { id: "decrease", group: "change", en: "decrease", def: "To go down. To get smaller. ↓",
      tr: {
        es: { word: "disminuir", def: "Bajar. Hacerse más pequeño. ↓" },
        ar: { word: "ينقص", def: "ينزل. يصير أصغر. ↓" },
        prs: { word: "کم شدن", def: "پایین آمدن. کوچک‌تر شدن. ↓" },
        fr: { word: "diminuer", def: "Descendre. Devenir plus petit. ↓" },
        tl: { word: "bumaba", def: "Bumaba. Lumiit. ↓" },
        af: { word: "afneem", def: "Afgaan. Kleiner word. ↓" }
      } },
    { id: "stay-the-same", group: "change", en: "stay the same", def: "To not go up or down.",
      tr: {
        es: { word: "quedar igual", def: "No subir ni bajar." },
        ar: { word: "يبقى كما هو", def: "لا يصعد ولا ينزل." },
        prs: { word: "همان‌طور ماندن", def: "بالا نرفتن و پایین نیامدن." },
        fr: { word: "rester pareil", def: "Ne pas monter ni descendre." },
        tl: { word: "manatiling pareho", def: "Hindi tumataas o bumababa." },
        af: { word: "dieselfde bly", def: "Nie opgaan of afgaan nie." }
      } },
    { id: "trial", group: "lab", en: "trial", def: "One time you do the experiment.",
      tr: {
        es: { word: "ensayo (prueba)", def: "Cada vez que haces el experimento." },
        ar: { word: "محاولة", def: "مرة واحدة تُجري فيها التجربة." },
        prs: { word: "آزمایش (یک بار)", def: "یک بار که تجربه را انجام می‌دهید." },
        fr: { word: "essai", def: "Une fois où tu fais l'expérience." },
        tl: { word: "pagsubok", def: "Isang beses na ginagawa mo ang eksperimento." },
        af: { word: "proef", def: "Een keer wat jy die eksperiment doen." }
      } },
    { id: "claim", group: "change", en: "claim", def: "A sentence that says what you think is true.",
      tr: {
        es: { word: "afirmación", def: "Una oración que dice lo que crees que es verdad." },
        ar: { word: "الادّعاء", def: "جملة تقول ما تظن أنه صحيح." },
        prs: { word: "ادعا", def: "جمله‌ای که می‌گوید فکر می‌کنید چه چیزی درست است." },
        fr: { word: "affirmation", def: "Une phrase qui dit ce que tu crois vrai." },
        tl: { word: "pahayag", def: "Pangungusap na nagsasabi ng akala mong totoo." },
        af: { word: "bewering", def: "'n Sin wat sê wat jy dink waar is." }
      } },
    { id: "compare", group: "change", en: "compare", def: "To look at two things. See how they are alike or different.",
      tr: {
        es: { word: "comparar", def: "Mirar dos cosas. Ver en qué son iguales o diferentes." },
        ar: { word: "يقارن", def: "انظر إلى شيئين. شاهد كيف يتشابهان أو يختلفان." },
        prs: { word: "مقایسه کردن", def: "به دو چیز ببینید. ببینید چطور مثل هم یا فرق دارند." },
        fr: { word: "comparer", def: "Regarder deux choses. Voir en quoi elles se ressemblent ou diffèrent." },
        tl: { word: "ihambing", def: "Tingnan ang dalawang bagay. Alamin kung paano sila magkapareho o magkaiba." },
        af: { word: "vergelyk", def: "Kyk na twee dinge. Sien hoe hulle eenders of anders is." }
      } }
  ]
};
