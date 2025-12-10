const XLSX = require('xlsx');

// Sample SBI PO questions data
const questions = [
  {
    'Question Order': 1,
    'Section': 'Quantitative Aptitude',
    'Direction text': 'Read the following information carefully and answer the questions given below.',
    'Question Text': 'What is the value of (15² - 13²)?',
    'Conclusion text': '',
    '(A) Option': '56',
    '(B) Option': '58',
    '(C) Option': '60',
    '(D) Option': '62',
    '(E) Option': '64',
    'Right option': 'A',
    'Marks': 1,
    'Average Time': 60,
    'Explanation Text': 'Using the formula a² - b² = (a+b)(a-b), we get (15+13)(15-13) = 28 × 2 = 56',
    'Explanation Images': '',
    'Direction Image': '',
    'Question Image': '',
    'Conclusion Image': '',
  },
  {
    'Question Order': 2,
    'Section': 'Quantitative Aptitude',
    'Direction text': '',
    'Question Text': 'A train 150 meters long passes a platform 200 meters long in 35 seconds. What is the speed of the train?',
    'Conclusion text': '',
    '(A) Option': '36 km/hr',
    '(B) Option': '40 km/hr',
    '(C) Option': '45 km/hr',
    '(D) Option': '50 km/hr',
    '(E) Option': '54 km/hr',
    'Right option': 'A',
    'Marks': 1,
    'Average Time': 90,
    'Explanation Text': 'Total distance = 150 + 200 = 350 meters. Time = 35 seconds. Speed = 350/35 = 10 m/s = 10 × 18/5 = 36 km/hr',
    'Explanation Images': '',
    'Direction Image': '',
    'Question Image': '',
    'Conclusion Image': '',
  },
  {
    'Question Order': 3,
    'Section': 'Quantitative Aptitude',
    'Direction text': 'Study the following graph carefully and answer the questions.',
    'Question Text': 'If the profit in 2020 was 20% more than in 2019, what was the profit in 2019?',
    'Conclusion text': '',
    '(A) Option': 'Rs. 50,000',
    '(B) Option': 'Rs. 60,000',
    '(C) Option': 'Rs. 70,000',
    '(D) Option': 'Rs. 80,000',
    '(E) Option': 'Rs. 90,000',
    'Right option': 'B',
    'Marks': 1,
    'Average Time': 120,
    'Explanation Text': 'Let profit in 2019 be x. Then profit in 2020 = 1.2x. If 2020 profit is 72,000, then x = 72,000/1.2 = 60,000',
    'Explanation Images': '',
    'Direction Image': '',
    'Question Image': '',
    'Conclusion Image': '',
  },
  {
    'Question Order': 4,
    'Section': 'Reasoning Ability',
    'Direction text': 'In each of the following questions, a statement is given followed by two conclusions. Give answer:',
    'Question Text': 'Statement: All roses are flowers. Some flowers are red. Conclusions: I. Some roses are red. II. All red things are flowers.',
    'Conclusion text': '',
    '(A) Option': 'Only conclusion I follows',
    '(B) Option': 'Only conclusion II follows',
    '(C) Option': 'Both conclusions follow',
    '(D) Option': 'Neither conclusion follows',
    '(E) Option': 'Cannot be determined',
    'Right option': 'D',
    'Marks': 1,
    'Average Time': 90,
    'Explanation Text': 'From the statements, we cannot conclude that some roses are red, nor can we say all red things are flowers. Neither conclusion follows.',
    'Explanation Images': '',
    'Direction Image': '',
    'Question Image': '',
    'Conclusion Image': '',
  },
  {
    'Question Order': 5,
    'Section': 'Reasoning Ability',
    'Direction text': 'Study the following arrangement and answer the questions: A B C D E F G H I J K L M N O P',
    'Question Text': 'Which letter is 5th to the right of the letter which is 8th from the left?',
    'Conclusion text': '',
    '(A) Option': 'M',
    '(B) Option': 'N',
    '(C) Option': 'O',
    '(D) Option': 'P',
    '(E) Option': 'L',
    'Right option': 'A',
    'Marks': 1,
    'Average Time': 60,
    'Explanation Text': '8th from left is H. 5th to the right of H is M (H, I, J, K, L, M)',
    'Explanation Images': '',
    'Direction Image': '',
    'Question Image': '',
    'Conclusion Image': '',
  },
  {
    'Question Order': 6,
    'Section': 'English Language',
    'Direction text': 'Read the following passage and answer the questions.',
    'Question Text': 'What is the main theme of the passage?',
    'Conclusion text': '',
    '(A) Option': 'Economic development',
    '(B) Option': 'Social inequality',
    '(C) Option': 'Environmental conservation',
    '(D) Option': 'Technological advancement',
    '(E) Option': 'Cultural heritage',
    'Right option': 'C',
    'Marks': 1,
    'Average Time': 120,
    'Explanation Text': 'The passage primarily discusses the importance of environmental conservation and sustainable practices.',
    'Explanation Images': '',
    'Direction Image': '',
    'Question Image': '',
    'Conclusion Image': '',
  },
  {
    'Question Order': 7,
    'Section': 'English Language',
    'Direction text': 'Choose the word which is most nearly the same in meaning as the word given in capital letters.',
    'Question Text': 'MAGNANIMOUS',
    'Conclusion text': '',
    '(A) Option': 'Generous',
    '(B) Option': 'Selfish',
    '(C) Option': 'Cruel',
    '(D) Option': 'Stingy',
    '(E) Option': 'Harsh',
    'Right option': 'A',
    'Marks': 1,
    'Average Time': 45,
    'Explanation Text': 'Magnanimous means generous in forgiving, noble, or unselfish. The synonym is Generous.',
    'Explanation Images': '',
    'Direction Image': '',
    'Question Image': '',
    'Conclusion Image': '',
  },
  {
    'Question Order': 8,
    'Section': 'General Awareness',
    'Direction text': '',
    'Question Text': 'Who is the current Governor of Reserve Bank of India?',
    'Conclusion text': '',
    '(A) Option': 'Shaktikanta Das',
    '(B) Option': 'Urjit Patel',
    '(C) Option': 'Raghuram Rajan',
    '(D) Option': 'Duvvuri Subbarao',
    '(E) Option': 'Y. V. Reddy',
    'Right option': 'A',
    'Marks': 1,
    'Average Time': 30,
    'Explanation Text': 'Shaktikanta Das is the current Governor of RBI, appointed in December 2018.',
    'Explanation Images': '',
    'Direction Image': '',
    'Question Image': '',
    'Conclusion Image': '',
  },
  {
    'Question Order': 9,
    'Section': 'General Awareness',
    'Direction text': '',
    'Question Text': 'Which of the following is not a member of BRICS?',
    'Conclusion text': '',
    '(A) Option': 'Brazil',
    '(B) Option': 'Russia',
    '(C) Option': 'India',
    '(D) Option': 'China',
    '(E) Option': 'Japan',
    'Right option': 'E',
    'Marks': 1,
    'Average Time': 30,
    'Explanation Text': 'BRICS stands for Brazil, Russia, India, China, and South Africa. Japan is not a member.',
    'Explanation Images': '',
    'Direction Image': '',
    'Question Image': '',
    'Conclusion Image': '',
  },
  {
    'Question Order': 10,
    'Section': 'Quantitative Aptitude',
    'Direction text': 'Each question is followed by two statements. You have to decide whether the data provided in the statements are sufficient to answer the question.',
    'Question Text': 'What is the value of x? Statement I: x² - 5x + 6 = 0 Statement II: x > 0',
    'Conclusion text': '',
    '(A) Option': 'Statement I alone is sufficient',
    '(B) Option': 'Statement II alone is sufficient',
    '(C) Option': 'Both statements together are sufficient',
    '(D) Option': 'Either statement alone is sufficient',
    '(E) Option': 'Neither statement is sufficient',
    'Right option': 'C',
    'Marks': 1,
    'Average Time': 90,
    'Explanation Text': 'From Statement I: x² - 5x + 6 = 0 gives (x-2)(x-3) = 0, so x = 2 or 3. Statement II tells us x > 0. Together, we need both to determine x uniquely, but we still get two values. Actually, we need both statements to narrow down, but the answer should be that both together give us x = 2 or 3.',
    'Explanation Images': '',
    'Direction Image': '',
    'Question Image': '',
    'Conclusion Image': '',
  },
];

// Create a new workbook
const workbook = XLSX.utils.book_new();

// Convert data to worksheet
const worksheet = XLSX.utils.json_to_sheet(questions);

// Set column widths for better readability
worksheet['!cols'] = [
  { wch: 15 }, // Question Order
  { wch: 25 }, // Section
  { wch: 40 }, // Direction text
  { wch: 50 }, // Question Text
  { wch: 30 }, // Conclusion text
  { wch: 20 }, // (A) Option
  { wch: 20 }, // (B) Option
  { wch: 20 }, // (C) Option
  { wch: 20 }, // (D) Option
  { wch: 20 }, // (E) Option
  { wch: 15 }, // Right option
  { wch: 10 }, // Marks
  { wch: 15 }, // Average Time
  { wch: 60 }, // Explanation Text
  { wch: 30 }, // Explanation Images
  { wch: 30 }, // Direction Image
  { wch: 30 }, // Question Image
  { wch: 30 }, // Conclusion Image
];

// Add worksheet to workbook
XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');

// Write to file
XLSX.writeFile(workbook, 'sample_questions_sbi_po.xlsx');

console.log('Sample Excel file created: sample_questions_sbi_po.xlsx');
console.log(`Total questions: ${questions.length}`);

