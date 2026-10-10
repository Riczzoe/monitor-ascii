import { createContext } from "react";
import { resolveConfig } from "./config";
export const Settings = createContext({config:resolveConfig({}),historyDays:7});
