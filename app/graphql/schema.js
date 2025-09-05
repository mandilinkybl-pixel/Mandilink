const { gql } = require('graphql-tag');

const typeDefs = gql`
  type Profile {
    address: String
    city: String
    state: String
    pincode: String
  }

  type Location {
    type: String!
    coordinates: [Float!]!
  }

  type User {
    id: ID!
    name: String!
    email: String!
    phone: String!
    password: String! # Avoid exposing in production
    location: Location!
    locationPermission: Boolean!
    profile: Profile
    role: Role! # Relationship to Role
    isActive: Boolean!
    resetPasswordToken: String
    resetPasswordExpires: String
    createdAt: String!
    updatedAt: String!
  }

  type Role {
    id: ID!
    name: String!
    permissions: [String!]!
    createdAt: String!
    updatedAt: String!
  }

  type Query {
    me: User
    getUser(id: ID!): User
    getRole(id: ID!): Role
    findUsersNear(location: [Float!]!, maxDistance: Float!): [User!]!
    allRoles: [Role!]!
  }

  type Mutation {
    register(name: String!, email: String!, phone: String!, password: String!, roleId: ID!): User!
    login(email: String!, password: String!): String!
    updateLocation(id: ID!, coordinates: [Float!]!): User!
    updateProfile(id: ID!, address: String, city: String, state: String, pincode: String): User!
    createRole(name: String!, permissions: [String!]!): Role!
    updateRole(id: ID!, name: String, permissions: [String]): Role!
  }
`;

module.exports = typeDefs;