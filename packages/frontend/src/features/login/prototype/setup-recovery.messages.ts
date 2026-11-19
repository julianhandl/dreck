// PROTOTYPE (branch prototype/setup-recovery-page): texts of the setup and recovery screens.
// Kept next to the prototype instead of in @dreck/shared/i18n so main never sees them; the
// winning texts move to packages/shared/src/i18n/{de,en}.ts.
import type { Language } from '@dreck/shared/i18n';

const de = {
  setup: {
    title: 'Willkommen bei Dreck',
    intro:
      'Leg zuerst dein Login an. Den Link dafür schreibt Dreck nur in seinen Log, damit niemand sonst dein Dreck übernehmen kann.',
    whatIsLog:
      'Der Log ist die Textausgabe des Containers, in dem Dreck läuft. Such dort nach SETUP LINK und öffne den Link darunter in diesem Browser.',
    newestBottom: 'Nur der neueste Link funktioniert. Er steht ganz unten.',
    noLink: 'Kein Link im Log, oder er funktioniert nicht?',
    writeLink: 'Neuen Link in den Log schreiben',
    linkWritten:
      'Erledigt. Der neue Link steht jetzt ganz unten im Log. Ältere Links funktionieren nicht mehr.',
    pasteLabel: 'Link aus dem Log',
    pasteHint: 'Füge den ganzen Link ein. Ein Teil ab /setup/ reicht auch.',
    pasteInvalid: 'Das sieht nicht wie ein Link aus dem Log aus.',
    open: 'Öffnen',
    stepWhere: 'Wie startest du Dreck?',
    stepOpen: 'So öffnest du den Log',
    stepPaste: 'Link öffnen',
    stepPasteHint: 'Klick den Link im Log an oder kopier ihn hierher.',
    lookLike: 'So sieht es im Log aus',
    lookLikeHint: 'Das hier ist ein Beispiel. Dein Link ist ein anderer.',
  },
  logHelp: {
    title: 'So öffnest du den Log',
    copy: 'Kopieren',
    copied: 'Kopiert',
    copyFailed: 'Kopieren geht hier nicht. Markier den Befehl und kopier ihn von Hand.',
    copyLabel: (command: string): string => `Befehl ${command} kopieren`,
    desktop: {
      title: 'Docker Desktop',
      body: 'Öffne Docker Desktop. Klick links auf „Containers“, dann auf „dreck“ und oben auf „Logs“.',
    },
    run: {
      title: 'Terminal (docker run)',
      body: 'Öffne ein Terminal. Unter Windows geht PowerShell oder dein WSL-Terminal. Gib ein:',
      otherName: 'Heißt dein Container anders? Dieser Befehl zeigt alle Namen:',
    },
    compose: {
      title: 'Docker Compose',
      body: 'Öffne ein Terminal im Ordner mit der Datei compose.yaml und gib ein:',
    },
    kubernetes: {
      title: 'Kubernetes',
      body: 'Namespace und Name des Deployments stehen in deinem Manifest:',
    },
  },
  form: {
    title: 'Login anlegen',
    intro: 'Damit meldest du dich ab jetzt bei Dreck an.',
    email: 'E-Mail',
    emailHint: 'Wird nicht geprüft und bekommt keine Mails. Sie ist nur dein Login.',
    name: 'Name',
    nameOptional: 'Name (optional)',
    nameHint: 'Erscheint in Reports, sobald mehr Leute Dreck nutzen.',
    nameSuggested: 'Aus deiner E-Mail vorgeschlagen. Du kannst ihn ändern.',
    nameDerived: (name: string): string =>
      `In Dreck heißt du „${name}“. Das kannst du später in den Einstellungen ändern.`,
    password: 'Passwort',
    passwordNew: 'Neues Passwort',
    passwordRepeat: 'Passwort wiederholen',
    passwordRule: 'Mindestens 15 Zeichen. Ein kurzer Satz ist leicht zu merken.',
    passwordLeft: (left: number): string =>
      left === 1 ? 'Noch 1 Zeichen' : `Noch ${left} Zeichen`,
    passwordOk: 'Lang genug',
    showPassword: 'Passwort anzeigen',
    hidePassword: 'Passwort verbergen',
    submit: 'Login anlegen und loslegen',
    errorEmail: 'Gib eine E-Mail an, z. B. name@example.com.',
    errorName: 'Gib einen Namen an.',
    errorShort: (left: number): string => `Zu kurz: Es fehlen noch ${left} Zeichen.`,
    errorRepeat: 'Die beiden Passwörter sind nicht gleich.',
  },
  expired: {
    title: 'Dieser Link funktioniert nicht mehr',
    setupBody:
      'Nur der neueste Setup-Link funktioniert. Vielleicht wurde Dreck neu gestartet oder schon ein neuerer Link erzeugt.',
    resetBody:
      'Ein Link zum Zurücksetzen gilt 1 Stunde und nur einmal. Fordere einfach einen neuen an.',
    requestNew: 'Neuen Link anfordern',
  },
  login: {
    title: 'Anmelden',
    email: 'E-Mail',
    password: 'Passwort',
    submit: 'Anmelden',
    forgot: 'Passwort vergessen?',
    wrong: 'E-Mail oder Passwort stimmt nicht.',
  },
  forgot: {
    title: 'Passwort vergessen?',
    intro:
      'Gib die E-Mail deines Logins ein. Bei einem Admin-Konto schreibt Dreck einen Link zum Zurücksetzen in den Log.',
    email: 'E-Mail',
    submit: 'Link anfordern',
    sentTitle: 'Schau in den Log',
    sent: 'Ist das ein Admin-Konto, steht der Link jetzt im Log des Containers. Sonst wende dich an einen Admin.',
    sentDetails: 'Such nach RESET LINK. Der Link gilt 1 Stunde und nur einmal.',
    back: 'Zurück zur Anmeldung',
  },
  reset: {
    title: 'Neues Passwort festlegen',
    forEmail: (email: string): string => `Für ${email}`,
    sessions: 'Danach bist du überall sonst abgemeldet, auch auf anderen Geräten.',
    submit: 'Passwort speichern und anmelden',
  },
  done: {
    title: 'Fertig, du bist angemeldet',
    body: (email: string): string =>
      `Ab jetzt meldest du dich mit ${email} und deinem Passwort an.`,
    again: 'Prototyp: von vorn',
  },
  limited: (seconds: number): string =>
    `Zu viele Anfragen. Versuch es in ${seconds} Sekunden noch einmal.`,
  limitedOver: 'Du kannst es jetzt noch einmal versuchen.',
};

export type SetupMessages = typeof de;

const en: SetupMessages = {
  setup: {
    title: 'Welcome to Dreck',
    intro:
      'First, create your login. Dreck writes the link for it only to its log, so nobody else can take over your Dreck.',
    whatIsLog:
      'The log is the text output of the container Dreck runs in. Look for SETUP LINK there and open the link below it in this browser.',
    newestBottom: 'Only the newest link works. It is at the very bottom.',
    noLink: 'No link in the log, or it does not work?',
    writeLink: 'Write a new link to the log',
    linkWritten:
      'Done. The new link is now at the very bottom of the log. Older links no longer work.',
    pasteLabel: 'Link from the log',
    pasteHint: 'Paste the whole link. The part from /setup/ on is enough too.',
    pasteInvalid: 'This does not look like a link from the log.',
    open: 'Open',
    stepWhere: 'How do you start Dreck?',
    stepOpen: 'How to open the log',
    stepPaste: 'Open the link',
    stepPasteHint: 'Click the link in the log or copy it here.',
    lookLike: 'What it looks like in the log',
    lookLikeHint: 'This is an example. Your link is a different one.',
  },
  logHelp: {
    title: 'How to open the log',
    copy: 'Copy',
    copied: 'Copied',
    copyFailed: 'Copying does not work here. Select the command and copy it by hand.',
    copyLabel: (command: string): string => `Copy command ${command}`,
    desktop: {
      title: 'Docker Desktop',
      body: 'Open Docker Desktop. Click “Containers” on the left, then “dreck”, then “Logs” at the top.',
    },
    run: {
      title: 'Terminal (docker run)',
      body: 'Open a terminal. On Windows, PowerShell or your WSL terminal works. Type:',
      otherName: 'Is your container called something else? This command lists all names:',
    },
    compose: {
      title: 'Docker Compose',
      body: 'Open a terminal in the folder with the compose.yaml file and type:',
    },
    kubernetes: {
      title: 'Kubernetes',
      body: 'Your manifest has the namespace and the name of the deployment:',
    },
  },
  form: {
    title: 'Create your login',
    intro: 'You will sign in to Dreck with this from now on.',
    email: 'Email',
    emailHint: 'Not verified and never gets mail. It is only your login.',
    name: 'Name',
    nameOptional: 'Name (optional)',
    nameHint: 'Shows up in reports once more people use Dreck.',
    nameSuggested: 'Suggested from your email. You can change it.',
    nameDerived: (name: string): string =>
      `In Dreck you are “${name}”. You can change this later in the settings.`,
    password: 'Password',
    passwordNew: 'New password',
    passwordRepeat: 'Repeat password',
    passwordRule: 'At least 15 characters. A short sentence is easy to remember.',
    passwordLeft: (left: number): string =>
      left === 1 ? '1 more character' : `${left} more characters`,
    passwordOk: 'Long enough',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    submit: 'Create login and get started',
    errorEmail: 'Enter an email, e.g. name@example.com.',
    errorName: 'Enter a name.',
    errorShort: (left: number): string => `Too short: ${left} more characters needed.`,
    errorRepeat: 'The two passwords do not match.',
  },
  expired: {
    title: 'This link no longer works',
    setupBody:
      'Only the newest setup link works. Dreck may have restarted, or a newer link was created.',
    resetBody: 'A reset link works for 1 hour and only once. Just request a new one.',
    requestNew: 'Request a new link',
  },
  login: {
    title: 'Sign in',
    email: 'Email',
    password: 'Password',
    submit: 'Sign in',
    forgot: 'Forgot your password?',
    wrong: 'Email or password is wrong.',
  },
  forgot: {
    title: 'Forgot your password?',
    intro:
      'Enter the email of your login. For an admin account, Dreck writes a reset link to the log.',
    email: 'Email',
    submit: 'Request link',
    sentTitle: 'Check the log',
    sent: 'If this is an admin account, the link is now in the container log. Otherwise, ask an admin.',
    sentDetails: 'Look for RESET LINK. The link works for 1 hour and only once.',
    back: 'Back to sign in',
  },
  reset: {
    title: 'Set a new password',
    forEmail: (email: string): string => `For ${email}`,
    sessions: 'Afterwards you are signed out everywhere else, on other devices too.',
    submit: 'Save password and sign in',
  },
  done: {
    title: 'Done, you are signed in',
    body: (email: string): string => `From now on, sign in with ${email} and your password.`,
    again: 'Prototype: start over',
  },
  limited: (seconds: number): string => `Too many requests. Try again in ${seconds} seconds.`,
  limitedOver: 'You can try again now.',
};

/** Prototype texts per language. */
export const setupMessages: Record<Language, SetupMessages> = { de, en };
