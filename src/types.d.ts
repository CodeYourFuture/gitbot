export type Maybe<T> = T | undefined;

export interface Repository {
	repoName: string;
	repoUrl: string;
	userLogin: string;
	userName?: string;
	userUrl: string;
}

export interface RepoRef {
	messageTs: string;
	owner: string;
	repo: string;
	userId: string;
	userName: string;
}
