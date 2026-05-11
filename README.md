# Loan Tracker System

A robust loan management and tracking system built with **Spring Boot** and **React**. This application helps manage loans, groups, installments, and payments with a automated allocation system.

## 🚀 Tech Stack

- **Backend:** Spring Boot 4.0+ (Java 26)
- **Database:** PostgreSQL
- **ORM:** Spring Data JPA with Hibernate
- **Frontend:** React (located in `/frontend`)
- **Build Tool:** Maven

## 🏗️ Project Architecture

The project follows a standard Spring Boot layered architecture:

- **Domain Models:** JPA entities representing the database schema (`Entry`, `Group`, `Payment`, `InstallmentDetail`, etc.).
- **Repositories:** Spring Data JPA interfaces for database abstraction.
- **Services:** Business logic layer (e.g., `PaymentAllocationService` handles the complex logic of applying payments to installments).
- **Controllers:** REST APIs for frontend-backend communication.

### Key Entities
- **Entry:** Represents a loan or financial entry.
- **InstallmentDetail:** Breaks down an entry into scheduled payments.
- **Payment:** Records of actual payments made.
- **PaymentAllocation:** Tracks how a single payment is distributed across various installments.
- **Group/Person:** Manages borrowers and organizational structures.

## 🛠️ Local Setup (PostgreSQL)

To run this project locally, you need to configure your PostgreSQL instance.

### 1. Database Configuration
The application is configured to look for a database named `loan_tracker`.

1. Open `src/main/resources/application.yml`.
2. Update the `datasource` section if your local settings differ:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/loan_tracker
    username: your_postgres_username
    password: your_postgres_password # Or set the DB_PASSWORD environment variable
```

### 2. Environment Variables
The current configuration uses `${DB_PASSWORD}`. You can either:
- Set an environment variable named `DB_PASSWORD`.
- Replace `${DB_PASSWORD}` directly with your password in `application.yml`.

### 3. Run the Backend
You can run the application using Maven:

```powershell
./mvnw spring-boot:run
```

The server will start on `http://localhost:8080`.

## 🎨 Next Phase: Frontend Development

The backend is largely set up with a comprehensive REST API. The next phase involves:

1. **Frontend Implementation:** Building the user interface in the `/frontend` directory using React.
2. **Integration:** The project is already configured with `frontend-maven-plugin`, which automatically:
   - Installs Node.js and npm.
   - Runs `npm install` and `npm run build`.
   - Copies the production build into the Spring Boot static resources.

To work on the frontend independently:
```powershell
cd frontend
npm install
npm start
```

## 📄 License
This project is for internal use as part of the CS 127 Machine Problem.
