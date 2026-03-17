import * as userRepository from "../repositories/user.repository.js";
import * as formatter from "../utils/formatter.js";
import rolesMap from "../data/roles.json" with { type: "json" };

export const initPermissions = () => {
  console.log("Initializing permissions...");
};

export const getPublicUsers = async () => {
  const users = await userRepository.findAll();
  return users.map((u) => ({
    id: u.id,
    name: formatter.formatName(u.name),
    roleName: rolesMap[u.id] || "Unknown",
  }));
};

export const getUserFormatted = async (id) => {
  const user = await userRepository.findById(id);
  if (!user) return null;
  return {
    id: user.id,
    name: formatter.formatName(user.name),
  };
};
