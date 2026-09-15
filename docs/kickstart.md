# Devlytics — Final Backend Development Prompt

You are working on the **Devlytics** project.

Your task is to inspect the existing project documentation and backend code, understand the established architecture/patterns, and then implement the **complete production-ready backend, PostgreSQL database, Docker Compose configuration, and API tests** according to the final project requirements.

---

## 1. Project Paths

The project root is:

```text
D:\devlytics-project
```

### Documentation folder

```text
D:\devlytics-project\docs
```

Important documentation files:

```text
D:\devlytics-project\docs\devlytics.md

D:\devlytics-project\docs\Devlytics_Final_Backend_PostgreSQL_API_Requirements.md
```

### Backend folder

```text
D:\devlytics-project\backend
```

The backend must be implemented inside the existing `backend` folder.

---

# 2. Documentation-First Requirement

Before writing or modifying any code:

1. Inspect the entire `docs` folder.
2. Read:

```text
docs\devlytics.md
docs\Devlytics_Final_Backend_PostgreSQL_API_Requirements.md
```

3. Review all other relevant `.md` files inside:

```text
D:\devlytics-project\docs
```

4. Inspect the existing backend source code and project structure.
5. Identify:

   * Existing architecture
   * Existing modules
   * Naming conventions
   * Folder structure
   * Database patterns
   * Entity/model patterns
   * DTO patterns
   * Validation patterns
   * Controller patterns
   * Service patterns
   * Repository/data-access patterns
   * Authentication/authorization patterns
   * Exception/error handling
   * Configuration/environment handling
   * Logging
   * Testing
   * Docker configuration
   * API response format

Do **not** start implementation until the existing patterns and requirements are understood.

---

# 3. Follow Existing Project Patterns

The existing project is the reference implementation for coding conventions and architecture.

Reuse and extend the established project patterns wherever appropriate.

Do NOT introduce a completely different architecture simply because another approach is preferred.

Follow the existing:

* Naming conventions
* Module structure
* Service structure
* Controller structure
* Repository/data-access structure
* DTO conventions
* Validation conventions
* Error handling
* Configuration patterns
* Dependency injection patterns
* Database conventions
* Testing conventions
* API response conventions

However, do not blindly copy existing code.

---

# 4. No Code Duplication

This is a strict requirement.

Before creating a new:

* Service
* Helper
* Utility
* Repository
* DTO
* Entity
* Guard
* Middleware
* Validator
* Exception
* Database query
* API response handler
* Authentication helper
* Configuration helper

search the existing project first.

If equivalent functionality already exists:

* Reuse it.
* Extend it if necessary.
* Refactor it into a reusable component if appropriate.

Do not create duplicate implementations.

Avoid:

```text
Duplicate services
Duplicate validation
Duplicate database queries
Duplicate DTO logic
Duplicate authentication logic
Duplicate response formatting
Duplicate constants
Duplicate utility functions
Duplicate business rules
```

Use reusable abstractions where they genuinely reduce duplication without over-engineering the project.

---

# 5. Fresh Devlytics Features

The existing project/sample code should be used primarily for:

* Architecture
* Coding patterns
* Conventions
* Reusable infrastructure

Do NOT copy unrelated business functionality from the sample/project.

Implement the **Devlytics-specific functionality fresh**, based on:

```text
docs\devlytics.md

docs\Devlytics_Final_Backend_PostgreSQL_API_Requirements.md
```

The final backend must represent the current Devlytics requirements, not an old/sample application.

Remove or avoid obsolete sample features that are not part of Devlytics.

---

# 6. Devlytics Backend Scope

Implement all backend requirements documented in the final documentation.

The backend should support the complete Devlytics platform, including the documented functionality around:

* Users
* Organizations/teams
* Projects/repositories
* Repository integrations
* Code analysis
* Code-quality metrics
* Developer rankings
* Team rankings
* Lines of code metrics
* Code-quality scoring
* AI-assisted code improvement suggestions
* Improvement areas
* AI analysis history/results
* Dashboard/reporting data
* Required relationships
* Required configuration
* Required API endpoints

Do not invent major features that are not documented.

If a requirement is unclear, first check all documentation and existing project patterns before making an implementation decision.

---

# 7. PostgreSQL Database

Create and configure the Devlytics PostgreSQL database.

Database name:

```text
devlytics_db
```

PostgreSQL must be integrated into the backend environment.

Follow the database schema defined in:

```text
docs\Devlytics_Final_Backend_PostgreSQL_API_Requirements.md
```

Implement all required:

* Tables
* Primary keys
* Foreign keys
* Relationships
* Indexes
* Unique constraints
* Required constraints
* Enum/status values
* Timestamps
* Audit fields where required

Use the required Devlytics table naming convention.

If the documentation specifies `tbl_` prefixes, maintain that convention consistently.

Example:

```text
tbl_users
tbl_organizations
tbl_projects
...
```

Do not create unnecessary tables.

Do not duplicate data that can correctly be represented through relationships.

---

# 8. Database Migrations

The database schema must be reproducible through migrations.

Create/update the required migrations for:

```text
devlytics_db
```

The project must support a clean database initialization.

A new developer should be able to clone the repository, start PostgreSQL, run migrations, and have the complete Devlytics schema available.

---

# 9. Environment Configuration

Do not hardcode:

* Database credentials
* JWT secrets
* API keys
* AI provider keys
* Repository integration secrets
* Other sensitive configuration

Use environment variables.

Provide/update the appropriate:

```text
.env.example
```

with safe placeholder values.

Example configuration categories:

```text
DATABASE_HOST
DATABASE_PORT
DATABASE_NAME
DATABASE_USER
DATABASE_PASSWORD

JWT_SECRET
JWT_EXPIRES_IN

AI configuration
GitHub/GitLab integration configuration
Application configuration
```

Use the exact configuration names required by the existing project pattern where applicable.

Never commit real secrets.

---

# 10. Docker Compose

Create or update Docker Compose so the Devlytics backend can run with PostgreSQL.

The Docker environment should include at minimum:

```text
Devlytics Backend
PostgreSQL
```

The services must communicate through the Docker Compose network.

Database configuration must use:

```text
devlytics_db
```

Ensure:

* PostgreSQL persistence through a volume
* Correct health checks
* Backend dependency on PostgreSQL readiness
* Environment variable configuration
* Correct ports
* Correct networking
* Reliable startup/restart behavior

Do not unnecessarily introduce additional infrastructure.

Only add services required by the documented Devlytics architecture.

---

# 11. Backend API Implementation

Implement all APIs documented in:

```text
Devlytics_Final_Backend_PostgreSQL_API_Requirements.md
```

For every endpoint, verify:

* HTTP method
* Route
* Parameters
* Query parameters
* Request body
* DTO
* Validation
* Authentication
* Authorization
* Database interaction
* Business logic
* Response structure
* HTTP status codes
* Error handling

Do not implement undocumented duplicate endpoints.

Maintain consistent API conventions across the entire backend.

---

# 12. Validation

Use the existing project's validation approach.

Validate:

* Required fields
* IDs
* UUIDs/identifiers where applicable
* Strings
* Numbers
* Enums
* Dates
* Pagination
* Filters
* Sorting
* Request payloads
* Authentication-related inputs

Invalid requests must return consistent API errors.

---

# 13. Authentication and Authorization

Follow the authentication architecture defined by the project documentation.

Implement required:

* Authentication
* Authorization
* User access control
* Organization/team access
* Project/repository permissions
* Role/permission checks where documented

Do not duplicate authentication logic across controllers/services.

Use reusable guards/middleware/services according to the existing architecture.

---

# 14. Repository / Git Integration

Implement repository integration requirements exactly as documented.

Support the providers explicitly defined by the requirements.

Do not implement additional providers unless required.

Repository-related functionality should be designed so that provider-specific logic is isolated and reusable.

Avoid placing provider-specific logic directly inside controllers.

---

# 15. Code Analysis

Implement the Devlytics code-analysis functionality according to the final requirements.

The analysis architecture should be modular so that future analyzers can be added without rewriting the core system.

Support the metrics defined in the documentation, including applicable:

* Code quality
* Lines of code
* Duplication
* Complexity
* Maintainability
* Performance-related findings
* Improvement areas
* Developer/project/team metrics

Do not invent scoring formulas if they are already defined in the documentation.

---

# 16. AI Improvement Suggestions

Implement the documented AI feature for identifying **code improvement areas**.

The AI layer must be isolated behind a reusable service/interface so the provider can be changed later.

The AI functionality should be capable of producing documented improvement categories such as:

* Code quality
* Duplication
* Performance
* Maintainability
* Security where documented
* Complexity
* Other documented improvement areas

Store AI analysis results according to the database requirements.

Do not tightly couple the entire backend to one AI provider.

If the documentation specifies free/local AI models, follow that requirement.

Do not introduce paid AI dependencies unless explicitly required.

---

# 17. Ranking System

Implement the documented Devlytics ranking functionality.

Support the required:

* Developer rankings
* Team rankings
* Project/repository rankings where documented
* Code-quality ranking
* LOC metrics
* Score calculations
* Ranking filters
* Ranking periods
* Required aggregation logic

Keep ranking calculations centralized and reusable.

Do not duplicate ranking formulas across multiple endpoints.

---

# 18. Dashboard and Reporting APIs

Implement the dashboard/reporting endpoints defined in the documentation.

Dashboard APIs should retrieve data through appropriate services/query layers rather than duplicating database queries across controllers.

Support required:

* Developer metrics
* Team metrics
* Project metrics
* Code-quality metrics
* Ranking information
* AI improvement areas
* Historical/period-based metrics where documented

Optimize database queries where necessary.

---

# 19. API Documentation

Ensure all APIs are documented using the project's existing API documentation approach.

Document:

* Endpoint
* Method
* Parameters
* Request body
* Response
* Error responses
* Authentication requirements

If the project already uses Swagger/OpenAPI, continue using that implementation.

Do not introduce a second API documentation framework unnecessarily.

---

# 20. Testing

After implementation, test the backend thoroughly.

At minimum test:

### Database

* PostgreSQL connection
* Database initialization
* Migrations
* Relationships
* Constraints
* Indexes where applicable

### API

Test every implemented endpoint.

Verify:

* Success response
* Validation failure
* Unauthorized request
* Forbidden request
* Not found
* Duplicate data
* Invalid parameters
* Database errors
* Edge cases

### Business Logic

Test:

* Ranking calculations
* Code-quality calculations
* Aggregations
* Filtering
* Pagination
* AI result handling
* Organization/team access
* Repository/project relationships

Use the project's existing testing framework and conventions.

---

# 21. API Endpoint Verification

After implementation, actually run the backend and test the APIs.

Do not only inspect the source code.

Perform:

```text
Install dependencies
Start PostgreSQL
Run migrations
Start backend
Verify database connection
Verify application startup
Test API endpoints
Run automated tests
Fix failures
Run tests again
```

If Docker Compose is available, test the Docker environment as well.

Verify that the backend works from a clean environment.

---

# 22. No Fake Success

Do not claim that an endpoint works unless it has actually been tested.

Do not mark functionality as complete merely because the code compiles.

The implementation is considered complete only after:

```text
Code implemented
+
Database connected
+
Migrations successful
+
Backend starts successfully
+
API endpoints tested
+
Automated tests pass
+
Docker Compose verified
```

---

# 23. Error Resolution Workflow

When an error occurs:

1. Read the complete error.
2. Identify the actual root cause.
3. Inspect the relevant existing implementation/pattern.
4. Fix the root cause.
5. Re-run the failing test.
6. Run related tests.
7. Run the complete test suite.
8. Verify that the fix did not introduce duplication or regression.

Do not use temporary hacks just to make tests pass.

Do not suppress errors without understanding them.

---

# 24. Code Quality Requirements

The final backend must be:

* Clean
* Modular
* Maintainable
* Testable
* Reusable
* Production-oriented
* Type-safe where applicable
* Consistent with the existing project
* Free from unnecessary duplication

Avoid:

* Dead code
* Commented-out old implementations
* Duplicate services
* Duplicate queries
* Duplicate DTOs
* Unused imports
* Unused dependencies
* Hardcoded credentials
* Hardcoded environment configuration
* Unnecessary abstractions
* Over-engineering

---

# 25. Documentation Must Stay Synchronized

If implementation reveals that the existing documentation is missing an important implementation detail, update the appropriate documentation.

Do not silently create functionality that contradicts the final requirements.

Keep:

```text
docs\devlytics.md

docs\Devlytics_Final_Backend_PostgreSQL_API_Requirements.md
```

consistent with the implemented backend.

---

# 26. Final Verification Checklist

Before declaring the task complete, verify:

### Documentation

* [ ] All relevant documentation reviewed
* [ ] `devlytics.md` reviewed
* [ ] `Devlytics_Final_Backend_PostgreSQL_API_Requirements.md` reviewed
* [ ] Requirements implemented
* [ ] Documentation synchronized

### Backend

* [ ] Existing architecture followed
* [ ] Existing coding patterns followed
* [ ] Devlytics features implemented fresh
* [ ] No unnecessary sample-code copying
* [ ] No duplicate functionality
* [ ] Validation implemented
* [ ] Error handling implemented
* [ ] Authentication/authorization implemented where required

### Database

* [ ] PostgreSQL configured
* [ ] Database name = `devlytics_db`
* [ ] All required tables created
* [ ] Relationships created
* [ ] Foreign keys created
* [ ] Constraints created
* [ ] Indexes created where required
* [ ] Migrations working

### Docker

* [ ] Docker Compose configured
* [ ] PostgreSQL container working
* [ ] Backend container working
* [ ] Persistent database volume configured
* [ ] Health checks configured
* [ ] Environment configuration working
* [ ] Backend successfully connects to PostgreSQL

### APIs

* [ ] All documented endpoints implemented
* [ ] Request validation working
* [ ] Authentication working
* [ ] Authorization working
* [ ] Correct HTTP status codes
* [ ] Correct response formats
* [ ] Error responses verified
* [ ] Pagination/filtering verified where required

### Testing

* [ ] Unit tests pass
* [ ] Integration tests pass
* [ ] API endpoint tests pass
* [ ] Database tests pass
* [ ] Docker environment tested
* [ ] No known failing tests

---

# 27. Final Report

At the end, provide a concise implementation report containing:

## Architecture

Explain the final backend architecture.

## Files Created

List all newly created files.

## Files Modified

List all modified files.

## Files Removed

List files removed and explain why.

## Database

List:

* Database name
* Tables
* Relationships
* Migrations
* Indexes

## APIs

List all implemented API endpoint groups.

## Docker

Explain:

* Backend container
* PostgreSQL container
* Ports
* Volumes
* Environment configuration

## Testing

Report:

```text
Total tests
Passed
Failed
Skipped
```

Also report the API endpoints that were manually/integration tested.

## Issues Fixed

List important implementation or configuration problems discovered and fixed.

## Remaining Work

Only list items that are genuinely incomplete.

Do not report incomplete work if it has already been implemented and tested.

---

# 28. Important Execution Rule

Follow this workflow strictly:

```text
1. Inspect docs
2. Inspect existing backend
3. Understand architecture/patterns
4. Compare requirements with existing implementation
5. Identify reusable code
6. Identify missing Devlytics functionality
7. Design required changes
8. Implement backend
9. Implement/update PostgreSQL schema
10. Create/update migrations
11. Configure devlytics_db
12. Configure Docker Compose
13. Implement APIs
14. Implement tests
15. Start PostgreSQL
16. Run migrations
17. Start backend
18. Test APIs
19. Run complete test suite
20. Fix failures
21. Re-run all tests
22. Review for duplication
23. Review documentation
24. Provide final implementation report
```

**Do not skip the inspection phase.**

**Do not create duplicate code.**

**Do not replace the existing project architecture without a documented reason.**

**Do not use mock data as a substitute for the actual PostgreSQL implementation.**

**Do not claim success without running and testing the implementation.**

The final result must be a **working Devlytics backend connected to PostgreSQL `devlytics_db`, runnable through Docker Compose, with all documented APIs implemented and tested.**
