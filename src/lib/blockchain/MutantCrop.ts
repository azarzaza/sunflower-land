/**
 * A cross chain cross-over!
 */
import { CropName } from "features/game/types/crops";
import { CONFIG } from "lib/config";
import Web3 from "web3";
import { AbiItem } from "web3-utils";
import MillionOnMarsABI from "./abis/MillionOnMars.json";
import { estimateGasPrice, parseMetamaskError } from "./utils";

const address = CONFIG.MOM_CONTRACT;

/**
 * Million on Mars NFT contract
 */
export class MutantCrops {
  private web3: Web3;
  private account: string;

  private minter: any;
  private mutantCrops: any;

  constructor(web3: Web3, account: string) {
    this.web3 = web3;
    this.account = account;
    this.minterContract = new this.web3.eth.Contract(
      MillionOnMarsABI as AbiItem[],
      address as string
    );
    this.mutantCrops = new this.web3.eth.Contract(
      MillionOnMarsABI as AbiItem[],
      address as string
    );
  }

  /**
   * Crops are minted sequentially, make sure the mutant will match what is on chain
   */
  public async totalSupply(): Promise<number> {
    const amount = await this.mutantCrops.methods.totalSupply().call();

    return amount;
  }

  /**
   * Trade the MoM NFT for a Sunflower Land Observatory
   * Players must sync after trading for the observatory to show
   */
  public async mint({
    signature,
    deadline,
    cropId,
    farmId,
  }: {
    signature: string;
    deadline: number;
    cropId: number;
    farmId: number;
  }) {
    const gasPrice = await estimateGasPrice(this.web3);

    return new Promise((resolve, reject) => {
      this.minter.methods
        .mint(signature, deadline, cropId, farmId)
        .send({ from: this.account, gasPrice })
        .on("error", function (error: any) {
          console.log({ error });

          reject(parseMetamaskError(error));
        })
        .on("transactionHash", function (transactionHash: any) {
          console.log({ transactionHash });
        })
        .on("receipt", function (receipt: any) {
          console.log({ receipt });
          resolve(receipt);
        });
    });
  }
}