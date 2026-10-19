import { OperationError } from './operations.mjs'

export async function verifyTeacherSession({ jwt, account, teams, teamId }) {
  if (!jwt) throw new OperationError(401, 'Du skal være logget ind som lærer.')
  const [user] = await Promise.all([
    account.get(),
    teams.get({ teamId }),
  ])
  return user
}
