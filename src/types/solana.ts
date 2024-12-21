export type ProgramInfoStruct = {
  programId: string;
  owner: string;
  programdataAddress: string;
  authority: false | "none" | string;
  lastDeploySlot: number;
  dataLen: number;
  lamports: number;
};

export type SolanaCliYaml = Partial<{
  json_rpc_url: string;
  websocket_url: string;
  keypair_path: string;
  address_labels: {
    [key in string]: string;
  };
  commitment: "processed" | "confirmed" | "finalized";
}>;
