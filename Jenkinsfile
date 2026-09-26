pipeline {
    agent any

    environment {
        CI = 'true'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Lint Code') {
            steps {
                sh 'npm run lint'
            }
        }

        stage('Run Unit Tests') {
            steps {
                // If any test fails, Jenkins marks the build as FAILED
                // and notifies GitHub commit status, blocking the PR
                sh 'npm test'
            }
        }
    }

    post {
        success {
            echo 'All Unit Tests and Lint checks passed successfully!'
        }
        failure {
            echo 'Build or Unit Tests failed. Pull request cannot be merged.'
        }
    }
}
