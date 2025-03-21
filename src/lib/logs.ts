import picocolors from "picocolors";
import type { Formatter } from "picocolors/types";
import { logger } from "./logger";

/**
 * Print a plain message using `picocolors`
 * (including a process exit code)
 */
export function titleMessage(
  msg: string,
  colorFn: Formatter = picocolors.inverse,
) {
  console.log(colorFn(` ${msg} `));
}

/**
 * Display a yellow warning message without exiting the cli
 */
export function warnMessage(msg: string) {
  console.log(picocolors.yellow(msg));
}

/**
 * Show a cancel outro and exit the cli process
 */
export function warningOutro(msg: string = "Operation canceled") {
  warnMessage(msg);
  logger.exit();
}

/**
 * Print a plain message using `picocolors`
 * (including a process exit code)
 */
export function cancelOutro(msg: string = "Operation canceled") {
  console.log(picocolors.inverse(` ${msg} `), "\n");
  // outro(picocolors.inverse(` ${msg} `));
  logger.exit(0);
}

/**
 * Print a blue notice message using `picocolors`
 * (including a process exit code)
 */
export function noticeOutro(msg: string) {
  // outro(picocolors.bgBlue(` ${msg} `));
  console.log(picocolors.bgBlue(` ${msg} `), "\n");
  logger.exit(0);
}

/**
 * Print a green success message using `picocolors`
 * (including a process exit code)
 */
export function successOutro(msg: string = "Operation successful") {
  console.log(picocolors.bgGreen(` ${msg} `), "\n");
  // outro(picocolors.bgGreen(` ${msg} `));
  logger.exit(0);
}

/**
 * Print a red error message using `picocolors`
 * (including a process exit code)
 */
export function errorOutro(
  msg: string,
  title: string = "An error occurred",
  extraLog?: any,
) {
  errorMessage(msg, title, extraLog);
  logger.exit(1);
}

/**
 * Display a error message with using `picocolors`
 * (including a process exit code)
 */
export function errorMessage(
  err: any,
  title: string | null = null,
  extraLog?: any,
) {
  let message = "Unknown error";

  if (typeof err == "string") {
    message = err;
  } else if (err instanceof Error) {
    message = err.message;
  }

  if (title) {
    console.log(picocolors.bgRed(` ${title} `));
    console.log(message);
  } else console.log(picocolors.bgRed(` ${message} `));
  if (extraLog) console.log(extraLog);
}
