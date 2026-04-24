const GITHUB_API = "https://api.github.com";

function getHeaders() {
  const token = process.env.GITHUB_TOKEN;
  return {
    "User-Agent": "book-catalog-app",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getContributors(owner, repo) {
  const contributors = [];
  let page = 1;

  while (true) {
    const response = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/contributors?per_page=100&page=${page}`,
      { headers: getHeaders() },
    );
    if (!response.ok) break;
    const data = await response.json();
    if (data.length === 0) break;
    contributors.push(...data.map((c) => c.login));
    page++;
  }

  return contributors;
}

export async function getSharedReposV1(request, reply) {
  const { repo } = request.query;
  const [owner, repoName] = repo.split("/");

  const mainContributors = new Set(await getContributors(owner, repoName));

  const reposResponse = await fetch(
    `${GITHUB_API}/orgs/${owner}/repos?per_page=100`,
    { headers: getHeaders() },
  );
  const repos = await reposResponse.json();

  const results = [];

  for (const r of repos) {
    if (r.name === repoName) continue;
    const contribs = await getContributors(owner, r.name);
    const shared = contribs.filter((c) => mainContributors.has(c));
    if (shared.length > 0) {
      results.push({ repo: r.full_name, sharedContributors: shared.length });
    }
    await sleep(100);
  }

  results.sort((a, b) => b.sharedContributors - a.sharedContributors);
  return reply.send(results.slice(0, 5));
}

export async function getSharedReposV2(request, reply) {
  const { repo } = request.query;
  const [owner, repoName] = repo.split("/");

  const query = `
    query($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        mentionableUsers(first: 100) {
          nodes { login }
        }
      }
      organization(login: $owner) {
        repositories(first: 50) {
          nodes {
            name
            mentionableUsers(first: 100) {
              nodes { login }
            }
          }
        }
      }
    }
  `;

  // retry з exponential backoff — 1s, 2s, 4s
  let json;
  // retry до 3 разів при тимчасових помилках GitHub
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getHeaders(),
      },
      body: JSON.stringify({ query, variables: { owner, repo: repoName } }),
    });

    if (response.ok) {
      json = await response.json();
      break;
    }

    if (attempt === 2) {
      const text = await response.text();
      throw new Error(
        `GitHub API error ${response.status}: ${text.slice(0, 100)}`,
      );
    }
    // exponential backoff: 1s, 2s, 4s

    const delay = 1000 * Math.pow(2, attempt);

    await sleep(delay);
  }

  if (json.errors) {
    throw new Error(json.errors[0].message);
  }

  if (!json.data) {
    throw new Error("GitHub GraphQL returned no data");
  }

  const { data } = json;
  // підрахунок спільних контрибуторів — та сама логіка що і в V1
  const mainContributors = new Set(
    data.repository.mentionableUsers.nodes.map((u) => u.login),
  );

  const results = data.organization.repositories.nodes
    .filter((r) => r.name !== repoName)
    .map((r) => {
      const shared = r.mentionableUsers.nodes.filter((u) =>
        mainContributors.has(u.login),
      ).length;
      return { repo: `${owner}/${r.name}`, sharedContributors: shared };
    })
    .filter((r) => r.sharedContributors > 0)
    .sort((a, b) => b.sharedContributors - a.sharedContributors)
    .slice(0, 5);

  return reply.send(results);
}
