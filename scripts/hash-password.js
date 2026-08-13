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
  console.log("\nاین خط رو کپی کن و تو فایل .env (یا تنظیمات Environment Variables تو Vercel) بذار:\n");
  console.log(`ADMIN_PASSWORD_HASH=${hash}`);
  console.log("\nخودِ رمز رو جایی ذخیره نکن، فقط این هش رو نگه دار.\n");
  rl.close();
});
