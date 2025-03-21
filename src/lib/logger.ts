import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { getAppInfo } from "./app-info";
import picocolors from "picocolors";

class ErrorLogger {
  private logFilePath: string | null = null;
  private logs: string[] = [];
  private appName: string;
  private version: string;
  private timestamp: string;

  constructor(appName?: string) {
    const info = getAppInfo();
    this.appName = appName || info.name;
    this.version = info.version;
    this.timestamp = new Date().toISOString();
  }

  /**
   * Log the args used on the command
   */
  public logArgs(): void {
    // const formattedMessage = `Args: ${process.argv.join(" ")}`;
    // this.logs.push(formattedMessage);
  }

  /**
   * Log an informational message
   */
  public info(message: string): void {
    const formattedMessage = `[INFO] ${new Date().toISOString()}: ${message}`;
    this.logs.push(formattedMessage);
  }

  /**
   * Log a warning message
   */
  public warn(message: string): void {
    const formattedMessage = `[WARN] ${new Date().toISOString()}: ${message}`;
    this.logs.push(formattedMessage);
  }

  /**
   * Log an error message and create log file if it doesn't exist yet
   */
  public error(message: string, error?: Error | string): void {
    let formattedMessage = `[ERROR] ${new Date().toISOString()}: ${message}`;

    if (error) {
      if (typeof error == "string") {
        formattedMessage += `\nMessage: ${error}`;
      } else if (error instanceof Error) {
        formattedMessage += `\nMessage: ${error.message}`;
        if (error.stack) {
          formattedMessage += `\nStack trace: ${error.stack}`;
        }
      }
    }

    this.logs.push(formattedMessage);

    // Create the log file now that we have an error
    this.ensureLogFile();

    // Write all accumulated logs to the file
    this.flushLogsToFile();
  }

  /**
   * Get the path to the log file
   * Returns null if no errors have been logged yet
   */
  public getLogFilePath(): string | null {
    return this.logFilePath;
  }

  /**
   * Print error notification to console
   * Only prints if an error has been logged
   */
  public printErrorNotification(): void {
    if (this.logFilePath) {
      console.error(
        picocolors.red(
          `\nAn error occurred during execution.\n` +
            `See the full log at: ${this.logFilePath}`,
        ),
      );
    }
  }

  /**
   * Exit the logger and print the error notification if needed
   */
  public exit(code?: number | string | null | undefined): void {
    this.flushLogsToFile();
    this.printErrorNotification();
    process.exit(code);
  }

  /**
   * Get all logged messages
   */
  public getLogs(): string[] {
    return [...this.logs];
  }

  /**
   * Create the log file if it doesn't exist yet
   */
  public ensureLogFile(): void {
    if (!this.logFilePath) {
      // Create a unique filename with timestamp
      const filename = `${this.appName}-error-${this.timestamp.replace(
        /:/g,
        "-",
      )}.log`;

      this.logFilePath = path.join(os.tmpdir(), filename);

      // Initialize the log file with header
      const header =
        [
          `# Error Log for ${this.appName}`,
          `Version:   ${this.version}`,
          `Timestamp: ${this.timestamp}`,
          `Command:   ${process.argv.slice(0, 2).join(" ")}`,
          `Arguments: ${
            process.argv.length > 2 ? process.argv.slice(2).join(" ") : "<NONE>"
          }`,
          `----------`,
        ].join("\n") + "\n";

      fs.writeFileSync(this.logFilePath, header, { encoding: "utf-8" });
    }
  }

  /**
   * Write all accumulated logs to the file
   */
  private flushLogsToFile(): void {
    if (!this.logFilePath) return;

    try {
      const content = this.logs.join("\n") + "\n";
      fs.appendFileSync(this.logFilePath, content, { encoding: "utf-8" });

      // Clear the logs array after flushing
      this.logs = [];
    } catch (err) {
      console.error("Failed to write to log file:", err);
    }
  }
}

export const logger = new ErrorLogger(getAppInfo().name);
