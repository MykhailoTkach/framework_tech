import { EventEmitter } from "events";

export const bookEvents = new EventEmitter();

export const EVENTS = {
  CREATED: "created",
  UPDATED: "updated",
  DELETED: "deleted",
};
