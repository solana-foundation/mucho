import fs from "fs";
import * as toml from "@iarna/toml";
import path from "path";
import { homedir } from "os";
import { warnMessage } from "@/lib/logs";
import { parse as yamlParse } from "yaml";

/**
 *
 */
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Resolve tilde based file paths for the current user's home directory
 */
export function resolveTilde(filePath: string) {
  if (filePath.startsWith("~")) {
    return path.join(homedir(), filePath.slice(1));
  }
  return filePath;
}

/**
 * Load a plaintext file from the local filesystem
 */
export function loadPlaintextFile(filePath: string): string | null {
  try {
    const data = fs.readFileSync(resolveTilde(filePath), "utf-8");
    return data;
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`File not found: ${filePath}`);
    } else {
      throw new Error(`Error reading file: ${error.message}`);
    }
  }
}

/**
 *
 */
export function loadJsonFile<T = object>(filePath: string): T | null {
  try {
    const parsedData: T = parseJson(loadPlaintextFile(filePath));
    return parsedData;
  } catch (error) {
    return null;
  }
}

/**
 *
 */
export function loadYamlFile<T = object>(filePath: string): T | null {
  try {
    const parsedData: T = yamlParse(loadPlaintextFile(filePath));
    return parsedData;
  } catch (error) {
    return null;
  }
}

/**
 *
 */
export function parseJson<T = object>(input: string): T | null {
  try {
    const parsedData: T = JSON.parse(input);
    return parsedData;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error("Error parsing JSON:", error.message);
    }
    return null;
  }
}

/**
 *
 */
export function loadTomlFile<T>(
  filePath: string,
  injectConfigPath: boolean = true,
): T | null {
  try {
    const data = loadPlaintextFile(filePath);
    const parsedData = toml.parse(data);
    if (injectConfigPath) parsedData.configPath = filePath;
    return parsedData as T;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error("Error parsing TOML:", error.message);
    }
    return null;
  }
}

/**
 * Recursively create all the folders in a given file path
 */
export function createFolders(filePath: string, resolve: boolean = true) {
  filePath = resolveTilde(filePath);
  if (resolve) {
    filePath = path.resolve(filePath);
    if (path.basename(filePath).includes("."))
      filePath = path.dirname(filePath);
  }
  return fs.mkdirSync(filePath, { recursive: true });
}

/**
 * Check if a file exists in the local file system
 */
export function doesFileExist(
  filePath: string,
  resolve: boolean = true,
): boolean {
  try {
    filePath = resolveTilde(filePath);
    if (resolve) filePath = path.resolve(filePath);
    fs.statfsSync(filePath);
    return true;
  } catch (err) {}
  return false;
}

/**
 * Check if a directory exists
 */
export function directoryExists(directoryPath: string): boolean {
  try {
    const stat = fs.statSync(resolveTilde(directoryPath));
    return stat.isDirectory();
  } catch (err) {
    // if there's an error, assume directory doesn't exist
    return false;
  }
}

/**
 *
 */
export function moveFiles(
  sourceDir: string,
  destinationDir: string,
  overwrite: boolean = false,
): void {
  if (!directoryExists(sourceDir)) {
    warnMessage(`[moveFiles] Source directory does not exist: ${sourceDir}`);
    return;
  }

  // Read all the files in the source directory
  const files = fs.readdirSync(sourceDir);

  // Create destination directory if it doesn't exist
  if (!directoryExists(destinationDir)) {
    createFolders(destinationDir);
  }

  files.forEach((file) => {
    const sourceFile = path.join(sourceDir, file);
    const destinationFile = path.join(destinationDir, file);

    // Check if file already exists at destination
    if (fs.existsSync(destinationFile)) {
      if (!overwrite) {
        // console.log(`File ${file} already exists, skipping...`);
        return;
      }
      // Remove existing file if overwrite is allowed
      fs.unlinkSync(destinationFile);
    }

    // Move the file by renaming it
    fs.cpSync(sourceFile, destinationFile);
    // console.log(`Copied file: ${file}`);
  });

  //   console.log("File moving completed.");
}

/**
 * Load all the file names inside a directory into a hashmap
 */
export function loadFileNamesToMap(
  dir: string,
  extension?: string,
): Map<string, string> {
  const fileMap = new Map<string, string>();

  if (!directoryExists(dir)) return fileMap;

  // Read all files from the specified directory
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);

    // Check if it is a file (not a directory)
    if (fs.statSync(filePath).isFile()) {
      const fileNameWithoutExt = path.basename(file, path.extname(file));

      // If an extension is specified, check if the file has that extension
      if (!extension || path.extname(file) === extension) {
        fileMap.set(fileNameWithoutExt, file); // Set without extension as key
      }
    }
  });

  return fileMap;
}

/**
 * Check/update a gitignore file for specific items
 */
export function updateGitignore(
  items: string[],
  gitignorePath: string = path.join(process.cwd(), ".gitignore"),
): void {
  let gitignoreContent: string = "";

  if (doesFileExist(gitignorePath)) {
    gitignoreContent = loadPlaintextFile(gitignorePath);
  }

  const gitignoreLines = gitignoreContent
    .split("\n")
    .map((line) => line.trim());
  let updated = false;

  items.forEach((item) => {
    if (!gitignoreLines.includes(item.trim())) {
      gitignoreContent += `\n${item.trim()}`;
      updated = true;
    }
  });

  if (updated) {
    fs.writeFileSync(gitignorePath, gitignoreContent.trim() + "\n", "utf-8");
  }
}

export function findClosestFile({
  fileName,
  maxDepth = 5,
  maxLevelsUp = 5,
  stopMarkers = [".git", "package.json", "cargo.toml"],
  startDir = process.cwd(),
  skipDirs = ["node_modules"],
}: {
  fileName: string;
  maxDepth?: number;
  maxLevelsUp?: number;
  stopMarkers?: string[];
  skipDirs?: string[];
  startDir?: string;
}): string | null {
  const visited = new Set<string>();

  // check if we're already in what looks like a repo
  const isLikelyRepo = stopMarkers.some((marker) =>
    fs.existsSync(path.join(startDir, marker)),
  );

  // if we are not in what looks like a repo, limit the search more aggressively
  if (!isLikelyRepo) {
    maxDepth = 2;
    maxLevelsUp = 2;
  }

  function crawlUp(currentDir: string, levelsUp: number): string | null {
    if (levelsUp > maxLevelsUp) return null;

    let targetPath = path.join(currentDir, fileName);
    if (fs.existsSync(targetPath)) return targetPath;
    targetPath = path.join(currentDir, fileName.toLowerCase());
    if (fs.existsSync(targetPath)) return targetPath;

    const hasMarker = stopMarkers.some((marker) =>
      fs.existsSync(path.join(currentDir, marker)),
    );

    if (hasMarker && levelsUp > 0) return null;

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) return null;

    return crawlUp(parentDir, levelsUp + 1);
  }

  function crawlDown(dir: string, depth: number): string | null {
    if (depth > maxDepth) return null;
    if (visited.has(dir)) return null;
    visited.add(dir);

    try {
      let targetPath = path.join(dir, fileName);
      if (fs.existsSync(targetPath)) return targetPath;
      targetPath = path.join(dir, fileName.toLowerCase());
      if (fs.existsSync(targetPath)) return targetPath;

      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        // skip hidden directories and node_modules
        if (entry.name.startsWith(".") || skipDirs.includes(entry.name))
          continue;

        if (entry.isDirectory()) {
          const fullPath = path.join(dir, entry.name);

          const hasMarker = stopMarkers.some((marker) =>
            fs.existsSync(path.join(fullPath, marker)),
          );
          if (hasMarker) continue;

          const result = crawlDown(fullPath, depth + 1);
          if (result) return result;
        }
      }
    } catch (error) {
      // honey badger don't care about errors
      return null;
    }

    return null;
  }

  const upResult = crawlUp(startDir, 0);
  if (upResult) return upResult;
  if (isLikelyRepo) return crawlDown(startDir, 0);

  return null;
}

export function isInCurrentDir(filePath: string): boolean {
  return path.resolve(process.cwd()) === path.resolve(path.dirname(filePath));
}

type AnyObject = Record<string, any>;

export function deepMerge<T extends AnyObject, U extends AnyObject>(
  obj1: T,
  obj2: U,
): T & U {
  const result: AnyObject = { ...obj1 };

  for (const key in obj2) {
    if (obj2.hasOwnProperty(key)) {
      if (isObject(obj2[key]) && isObject(result[key])) {
        // Recursively merge nested objects
        result[key] = deepMerge(result[key], obj2[key]);
      } else {
        // Directly assign the value from obj2
        result[key] = obj2[key];
      }
    }
  }

  return result as T & U;
}

export function isObject(value: any): value is AnyObject {
  return value && typeof value === "object" && !Array.isArray(value);
}

export function timeAgo(date: Date | string | number): string {
  const now = new Date();
  const past = new Date(date);
  const msPerMinute = 60 * 1000;
  const msPerHour = msPerMinute * 60;
  const msPerDay = msPerHour * 24;
  const msPerMonth = msPerDay * 30;
  const msPerYear = msPerDay * 365;

  const elapsed = now.getTime() - past.getTime();

  // Handle future dates
  if (elapsed < 0) {
    return "in the future";
  }

  // Handle different time ranges
  if (elapsed < msPerMinute) {
    const seconds = Math.round(elapsed / 1000);
    return `${seconds} ${seconds === 1 ? "second" : "seconds"} ago`;
  } else if (elapsed < msPerHour) {
    const minutes = Math.round(elapsed / msPerMinute);
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  } else if (elapsed < msPerDay) {
    const hours = Math.round(elapsed / msPerHour);
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  } else if (elapsed < msPerMonth) {
    const days = Math.round(elapsed / msPerDay);
    return `${days} ${days === 1 ? "day" : "days"} ago`;
  } else if (elapsed < msPerYear) {
    const months = Math.round(elapsed / msPerMonth);
    return `${months} ${months === 1 ? "month" : "months"} ago`;
  } else {
    const years = Math.round(elapsed / msPerYear);
    return `${years} ${years === 1 ? "year" : "years"} ago`;
  }
}

export function numberStringToNumber(localeString: string): number {
  return Number(
    localeString.replace(
      new RegExp(
        `[${new Intl.NumberFormat().format(11111).replace(/\d/g, "")}]`,
        "g",
      ),
      "",
    ),
  );
}

export function stringifiedNumber(input: string): number {
  try {
    return parseFloat(input);
  } catch (err) {
    throw new Error("Input value is not a number");
  }
}

export function wordWithPlurality(
  input: number | string,
  singular: string,
  plural: string,
) {
  if (typeof input == "string") input = stringifiedNumber(input);
  if (input == 1) return singular;
  else return plural;
}
