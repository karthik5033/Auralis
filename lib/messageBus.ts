import type { AgentMessage, AgentType } from "@/types/contract";

export type MessageHandler<T = unknown> = (message: AgentMessage<T>) => void | Promise<void>;

type Subscription<T> = {
  source: AgentType | "*";
  target: AgentType | "broadcast" | "*";
  handler: MessageHandler<T>;
};

function createMessageId(): string {
  return crypto.randomUUID();
}

/** In-memory pub/sub transport used by the agent runtime. */
export class MessageBus {
  private readonly subscriptions = new Map<string, Set<Subscription<unknown>>>();

  subscribe<T>(
    type: string,
    handler: MessageHandler<T>,
    options: {
      source?: AgentType | "*";
      target?: AgentType | "broadcast" | "*";
    } = {},
  ): () => void {
    const subscription: Subscription<T> = {
      source: options.source ?? "*",
      target: options.target ?? "*",
      handler,
    };
    const subscriptions = this.subscriptions.get(type) ?? new Set<Subscription<unknown>>();
    subscriptions.add(subscription as Subscription<unknown>);
    this.subscriptions.set(type, subscriptions);

    return () => {
      subscriptions.delete(subscription as Subscription<unknown>);
      if (subscriptions.size === 0) this.subscriptions.delete(type);
    };
  }

  async publish<T>(message: AgentMessage<T>): Promise<void> {
    const subscriptions = this.subscriptions.get(message.type);
    if (!subscriptions) return;

    const matchingSubscriptions = [...subscriptions].filter(
      (subscription) =>
        (subscription.source === "*" || subscription.source === message.source) &&
        (subscription.target === "*" ||
          message.target === "broadcast" ||
          subscription.target === message.target),
    );

    await Promise.all(
      matchingSubscriptions.map(async (subscription) => {
        try {
          await subscription.handler(message);
        } catch (error) {
          console.error(`Message handler failed for ${message.type}`, error);
        }
      }),
    );
  }

  createMessage<T>(input: Omit<AgentMessage<T>, "messageId" | "timestamp">): AgentMessage<T> {
    return {
      ...input,
      messageId: createMessageId(),
      timestamp: new Date().toISOString(),
    };
  }

  clear(): void {
    this.subscriptions.clear();
  }
}

export const messageBus = new MessageBus();