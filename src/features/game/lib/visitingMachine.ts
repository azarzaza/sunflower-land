import { metamask } from "lib/blockchain/metamask";
import { ERRORS } from "lib/errors";
import { createMachine, assign, Interpreter } from "xstate";
import { getOnChainState, isFarmBlacklisted } from "../actions/onchain";
import { GameState } from "../types/game";
import { EMPTY } from "./constants";
export interface Context {
  state: GameState;
  farmId?: number;
  address?: string;
  owner?: string;
  isBlacklisted?: boolean;
  errorCode?: keyof typeof ERRORS;
}

type State = {
  value: "loading" | "blacklisted" | "visiting" | "error";
  context: Context;
};

type Event =
  | {
      type: "VISIT_NEW_FARM";
    }
  | {
      type: "CHAIN_CHANGED";
    }
  | {
      type: "ACCOUNT_CHANGED";
    }
  | {
      type: "REFRESH";
    }
  | {
      type: "CONTINUE";
    };

export type StateKeys = keyof Omit<State, "context">;
export type MachineInterpreter = Interpreter<Context, any, Event, State>;
export type StateValues = State[StateKeys];

const setFarmDetails = assign<Context, any>({
  farmId: (_context, event) => event.data.farmId,
  address: (_context, event) => event.data.address,
  isBlacklisted: (_context, event) => event.data.isBlacklisted,
  owner: (_context, event) => event.data.owner,
  state: (_, event) => event.data.state,
});

export function startGame({ farmToVisitID }: { farmToVisitID: number }) {
  return createMachine<Context, Event, State>(
    {
      id: "visitingMachine",
      context: { state: EMPTY, isBlacklisted: undefined },
      initial: "loading",
      states: {
        loading: {
          invoke: {
            src: "loadFarmToVisit",
            onDone: [
              {
                target: "blacklisted",
                cond: (context) => !!context.isBlacklisted,
                actions: setFarmDetails,
              },
              {
                target: "visiting",
                actions: setFarmDetails,
              },
            ],
            onError: {
              target: "error",
            },
          },
        },
        blacklisted: {},
        visiting: {},
        error: {},
      },
    },
    {
      services: {
        loadFarmToVisit: async (): Promise<Context | undefined> => {
          const farmAccount = await metamask.getFarm()?.getFarm(farmToVisitID);

          const { game: onChain, owner } = await getOnChainState({
            farmAddress: farmAccount.account,
            id: farmToVisitID,
          });

          const isBlacklisted = await isFarmBlacklisted(farmToVisitID);

          return {
            farmId: farmAccount.tokenId,
            address: farmAccount.account,
            owner,
            isBlacklisted,
            state: { id: farmToVisitID, ...onChain },
          };
        },
      },
      actions: {
        assignErrorMessage: assign<Context, any>({
          errorCode: (_context, event) => event.data.message,
        }),
        assignIsBlacklisted: assign<Context, any>({
          isBlacklisted: (_context, event) => event.data.isBlacklisted,
        }),
      },
    }
  );
}