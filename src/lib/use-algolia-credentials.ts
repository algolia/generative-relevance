import { useLocalStorage } from 'usehooks-ts';

const STORAGE_KEY = 'ALGOLIA_GENERATIVE_RELEVANCE';

export function useAlgoliaCredentials() {
  const [credentials, setCredentials] = useLocalStorage(STORAGE_KEY, {
    appId: '',
    writeApiKey: '',
  });

  function updateCredentials(
    newCredentials: Partial<{ appId: string; writeApiKey: string }>
  ) {
    setCredentials({ ...credentials, ...newCredentials });
  }

  return {
    appId: credentials.appId,
    writeApiKey: credentials.writeApiKey,
    updateCredentials,
  };
}
