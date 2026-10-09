import assert from 'node:assert/strict'
import test from 'node:test'
import resolveAppConfig from '../app.config.ts'

const linkedProjectId = '83dd3aa4-69f4-4339-9891-cc40353cb3aa'
const buildProjectId = '11111111-2222-4333-8444-555555555555'
const overrideProjectId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'

function withEnvironment(values, action) {
  const keys = Object.keys(values)
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]))

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }

  try {
    return action()
  } finally {
    for (const key of keys) {
      const value = previous[key]
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

function baseConfig(projectId = linkedProjectId) {
  return {
    config: {
      name: 'BarberTrix',
      slug: 'barbertrix',
      extra: { eas: { projectId } },
    },
  }
}

test('EAS builds accept the project id already linked in app config', () => {
  const result = withEnvironment({
    EAS_BUILD: '1',
    EAS_BUILD_PROJECT_ID: undefined,
    EXPO_PUBLIC_EAS_PROJECT_ID: undefined,
  }, () => resolveAppConfig(baseConfig()))

  assert.equal(result.extra.eas.projectId, linkedProjectId)
})

test('EAS_BUILD_PROJECT_ID overrides the linked app config value', () => {
  const result = withEnvironment({
    EAS_BUILD: '1',
    EAS_BUILD_PROJECT_ID: buildProjectId,
    EXPO_PUBLIC_EAS_PROJECT_ID: undefined,
  }, () => resolveAppConfig(baseConfig()))

  assert.equal(result.extra.eas.projectId, buildProjectId)
})

test('explicit public project id override has highest precedence', () => {
  const result = withEnvironment({
    EAS_BUILD: '1',
    EAS_BUILD_PROJECT_ID: buildProjectId,
    EXPO_PUBLIC_EAS_PROJECT_ID: overrideProjectId,
  }, () => resolveAppConfig(baseConfig()))

  assert.equal(result.extra.eas.projectId, overrideProjectId)
})

test('EAS build fails only when no project id source exists', () => {
  assert.throws(
    () => withEnvironment({
      EAS_BUILD: '1',
      EAS_BUILD_PROJECT_ID: undefined,
      EXPO_PUBLIC_EAS_PROJECT_ID: undefined,
    }, () => resolveAppConfig(baseConfig(undefined))),
    /Link the project with EAS/,
  )
})

test('invalid project ids are rejected before build configuration is returned', () => {
  assert.throws(
    () => withEnvironment({
      EAS_BUILD: '1',
      EAS_BUILD_PROJECT_ID: undefined,
      EXPO_PUBLIC_EAS_PROJECT_ID: 'not-a-uuid',
    }, () => resolveAppConfig(baseConfig())),
    /EAS projectId must be the UUID assigned by EAS/,
  )
})
