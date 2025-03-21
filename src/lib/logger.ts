import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { getAppInfo } from "./app-info";

class ErrorLogger {
  private logFilePath: string | null = null;
  private logs: string[] = [];
  private appName: string;
  private timestamp: string;

  constructor(appName: string) {
    this.appName = appName;
    this.timestamp = new Date().toISOString();

    // Initialize the log file with header
    this.logs.push(
      `# Error Log: ${this.appName}`,
      `Timestamp: ${this.timestamp}`,
      `Command:   ${process.argv.slice(0, 2).join(" ")}`,
      `Arguments: ${
        process.argv.length > 2 ? process.argv.slice(2).join(" ") : "<NONE>"
      }`,
      `----------`,
    );
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
      if (error instanceof Error) {
        formattedMessage += `\nError: ${error.message}`;
        if (error.stack) {
          formattedMessage += `\nStack trace:\n${error.stack}`;
        }
      } else if (typeof error == "string") {
        formattedMessage += `\nError: ${error}`;
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
        "An error occurred during execution.",
        "See the full log at:",
        this.logFilePath,
      );
    }
  }

  /**
   * Exit the logger and print the error notification if needed
   */
  public exit(): void {
    // const formattedMessage = `Args: ${process.argv.join(" ")}`;
    // this.logs.push(formattedMessage);

    this.printErrorNotification();
    process.exit();
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
      fs.writeFileSync(this.logFilePath, "");
    }
  }

  /**
   * Write all accumulated logs to the file
   */
  private flushLogsToFile(): void {
    if (!this.logFilePath) return;

    try {
      const content = this.logs.join("\n") + "\n";
      fs.writeFileSync(this.logFilePath, content, { flag: "w" });
    } catch (err) {
      console.error("Failed to write to log file:", err);
    }

    // Clear the logs array after flushing
    this.logs = [];
  }
}

export const logger = new ErrorLogger(getAppInfo().name);
