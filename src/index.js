const { ApolloServer, gql } = require('apollo-server');
const { sequelize } = require('./models');

const typeDefs = require('./graphql/typeDefs');
const resolvers = require('./graphql/resolvers');
const contextMiddleware = require('./utils/contextMiddleware');


const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: contextMiddleware
})

server.listen().then(({ url }) => {
    console.log(`Server running on ${url}...`)

    sequelize.authenticate()
    .then(() => console.log('Database is connected...'))
    .catch(e => console.log(e))
})