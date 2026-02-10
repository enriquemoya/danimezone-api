declare module "pg" {
  export type ClientConfig = { connectionString?: string };

  export class Client {
    constructor(config?: ClientConfig);
    connect(): Promise<void>;
    query: (text: string, params?: any[]) => Promise<{ rows: any[]; rowCount?: number }>;
    end(): Promise<void>;
  }
}
