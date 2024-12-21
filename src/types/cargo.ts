export type CargoToml = {
  configPath?: string;
  workspace?: {
    members: string[];
  };
  package: {
    name: string;
    version: string;
    description?: string;
    edition: string;
  };
  lib?: {
    "crate-type"?: ("cdylib" | "lib")[];
    name?: string;
  };
  dependencies?: {
    [dependencyName: string]: string;
  };
};

export type CargoTomlWithConfigPath = Omit<CargoToml, "configPath"> &
  NonNullable<{ configPath: CargoToml["configPath"] }>;
