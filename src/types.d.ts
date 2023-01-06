export type Maybe<T> = T | undefined;

export interface Repository {
	repoName: string;
	repoUrl: string;
	userLogin: string;
	userName?: string;
	userUrl: string;
}
