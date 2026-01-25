import { FXAggregator } from "./aggregator";
import { CFETSProvider } from "./cfets.provider";
import { FrankfurterProvider } from "./frankfurter.provider";

const aggregator = new FXAggregator([
  new CFETSProvider(),
  new FrankfurterProvider()
]);

aggregator.getAggregatedRates('USD').then(console.log);