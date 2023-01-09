export type Maybe<T> = T | undefined;

export interface Repository {
	repoName: string;
	repoUrl: string;
	userLogin: string;
	userName?: string;
	userUrl: string;
}

export interface RepoRef {
	owner: string;
	repo: string;
}
