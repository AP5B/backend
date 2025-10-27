import { Server } from "http";
import { createApp } from "../../src/app";
import express from "express";

export class TestServer {
  private server: Server | null = null;
  private app: express.Application;

  constructor() {
    this.app = createApp();
  }

  async start(): Promise<void> {
    try {
      return new Promise((resolve) => {
        this.server = this.app.listen(0, () => {
          resolve();
        });
      });
    } catch (error) {
      console.error("Failed to start test server:", error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.server) return;

    return new Promise((resolve, reject) => {
      this.server?.close((err) => (err ? reject(err) : resolve()));
    });
  }

  getApp(): express.Application {
    return this.app;
  }

  getServer(): Server | null {
    return this.server;
  }
}
