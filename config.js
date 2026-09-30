/* Dollar Math · site settings. This is the only file to edit after the accounts exist (see 00-УТРО.md).
   email.provider:
     "gumroad"  (default) the button opens the free Gumroad product; Gumroad collects the email and sends the file.
     "form"     a real email form posting to your email tool (Kit, MailerLite, beehiiv, Formspree...):
                set email.action to the form URL from that tool and email.field to its email field name. */
window.DM_CONFIG = {
  brand: "Dollar Math",
  links: {
    free: "https://dollarmath.gumroad.com/l/debt-free-calculator",
    paid: "https://dollarmath.gumroad.com/l/money-dashboard",
    support: "mailto:hello@dollarmath.co"
  },
  price: "$19",
  email: {
    provider: "gumroad",
    action: "",            // e.g. "https://app.kit.com/forms/1234567/subscriptions"
    field: "email_address", // Kit: email_address · MailerLite: fields[email] · beehiiv/Formspree: email
    hidden: {}             // extra hidden inputs your tool needs, e.g. {"tags[]": "calculator"}
  }
};
