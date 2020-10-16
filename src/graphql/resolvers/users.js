const { hash, compare } = require('bcryptjs');
const { UserInputError, AuthenticationError } = require('apollo-server');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

const { User, Message } = require('../../models');


module.exports = {
    Query: {
        getUsers: async (_, __, { user }) => {
          try {
            if (!user) throw new AuthenticationError('Unauthenticated')
    
            let users = await User.findAll({
              attributes: ['username', 'imageUrl', 'createdAt'],
              where: { username: { [Op.ne]: user.username } },
            })
    
            const allUserMessages = await Message.findAll({
              where: {
                [Op.or]: [{ from: user.username }, { to: user.username }],
              },
              order: [['createdAt', 'DESC']],
            })
    
            users = users.map((otherUser) => {
              const latestMessage = allUserMessages.find(
                (m) => m.from === otherUser.username || m.to === otherUser.username
              )
              otherUser.latestMessage = latestMessage
              return otherUser
            })
    
            return users
          }  catch (error) {
                console.log(error)
            }
        },

        login: async (_, args) => {
            const { username, password } = args
            let errors = {}

            try {
              if (username.trim() === '') errors.username = 'username must not be empty'
              if (password === '') errors.password = 'password must not be empty'
      
              if (Object.keys(errors).length > 0) throw new UserInputError('bad input', { errors })
              
              const user = await User.findOne({ where: { username }})

              if (!user) {
                errors.username = 'user not found'
                throw new UserInputError('user not found', { errors })
              }

              const correctPassword = await compare(password, user.password)

              if (!correctPassword) {
                errors.password = 'password is incorrect'
                throw new UserInputError('password is incorrect', { errors })
              }

              const token = jwt.sign({ username }, 'SECRETT', {
                expiresIn: 60 * 60,
              })

              return {
                ...user.toJSON(),
                createdAt: user.createdAt.toISOString(),
                token
              }


            } catch (err) {
                console.log(err)
                throw err
            }
        }
    },
    Mutation: {
        register: async (_, args) => {
            let { username, email, password, confirmPassword } = args
            let errors = {}

            try {
                if (email.trim() === '') errors.email = 'email must not be empty'
                if (username.trim() === '') errors.username = 'username must not be empty'
                if (password.trim() === '') errors.password = 'password must not be empty'
                if (confirmPassword.trim() === '') errors.confirmPassword = 'repeat password must not be empty'
                if (password !== confirmPassword) errors.confirmPassword = 'passwords must match'

                if (Object.keys(errors).length > 0) throw errors


                password = await hash(password, 12)

                const user = await User.create({
                  username,
                  password,
                  email
                })

                console.log(user)
                return user;
            } catch (err) {
                console.log(err)

                if (err.name === 'SequelizeUniqueConstraintError') {
                    err.errors.forEach(
                      (e) => (errors[e.path] = `${e.path} is already taken`)
                    )
                  } else if (err.name === 'SequelizeValidationError') {
                    err.errors.forEach((e) => (errors[e.path] = e.message))
                  }
                  throw new UserInputError('Bad input', { errors })
            }
        }
    }
}