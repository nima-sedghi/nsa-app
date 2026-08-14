const bcrypt = require("bcryptjs");
const readline = require("readline");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question("رمز ادمین رو وارد کن (تو ترمینال دیده میشه، بعداً از کدت پاکش کن): ", (pw) => {
  if (!pw || pw.length < 6) {
    console.log("\nرمز باید حداقل ۶ کاراکتر باشه. دوباره اجرا کن.");
    rl.close();
    return;
  }
  const hash = bcrypt.hashSync(pw, 12);
  const escapedForDotenv = hash.replace(/\$/g, "\\$");

  console.log("\n۱) تو تنظیمات Environment Variables توی Vercel (یا هر جای دیگه که مستقیم متغیر رو وارد می‌کنی، نه فایل .env) دقیقاً همین رو بذار:\n");
  console.log(`ADMIN_PASSWORD_HASH=${hash}`);

  console.log("\n۲) اگه داری تو یه فایل .env محلی (رو کامپیوتر خودت) می‌ذاریش، حتماً این نسخه رو استفاده کن (با \\$ به‌جای $):\n");
  console.log(`ADMIN_PASSWORD_HASH=${escapedForDotenv}`);
  console.log(
    "\nدلیلش اینه: Next.js وقتی فایل .env رو می‌خونه، $ رو نشونه‌ی جایگزینی متغیر می‌دونه (مثل شل)، و چون هش bcrypt پر از $ هست، بدون \\$ کردن، هش خراب میشه و رمز همیشه اشتباه در میاد — حتی اگه رمز درست باشه."
  );
  console.log("\nخودِ رمز رو جایی ذخیره نکن، فقط این هش رو نگه دار.\n");
  rl.close();
});
