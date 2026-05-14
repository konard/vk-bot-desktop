## Final notes

We also might want to use `https://dev.vk.com/ru/method/account.getAppPermissions` for diagnostics, may be some actions are simply not available for the application we do sign in through. So it may be the root cause for of some errors, so if we get error like `Unknown method passed`, we should try to check if we have permission for that method, and fail immediately if we get `Unknown method passed`, but we can use getAppPermissions for diagnostics before actually failing. So we keep as much code as we have, it may just don't work with current app permission, and once later we will get our own app and permissions are granted by VK, we might get full access required.

We need to download all logs and data related about the issue to this repository, make sure we compile that data to `./docs/case-studies/issue-{id}` folder, and use it to do deep case study analysis (also make sure to search online for additional facts and data), in which we will reconstruct timeline/sequence of events, list of each and all requirements from the issue, find root causes of the each problem, and propose possible solutions and solution plans for each requirement (we should also check known existing components/libraries, that solve similar problem or can help in solutions).

If there is not enough data to find actual root cause, add debug output and verbose mode if not present, that will allow us to find root cause on next iteration.

If issue related to any other repository/project, where we can report issues on GitHub, please do so. Each issue must contain reproducible examples, workarounds and suggestions for fix the issue in code.

Please plan and execute everything in this single pull request, you have unlimited time and context, as context auto-compacts and you can continue indefinitely, until it is each and every requirement fully addressed, and everything is totally done.
