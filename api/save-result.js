const fetch = require('node-fetch');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const testData = req.body;
        
        const totalQuestions = testData.questions.length;
        const correctAnswers = testData.questions.filter(q => q.selected === q.correct).length;
        const score = Math.round((correctAnswers / totalQuestions) * 100);
        
        const minutesSpent = Math.floor(testData.timeSpent / 60);
        const secondsSpent = testData.timeSpent % 60;
        const timeSpentFormatted = `${minutesSpent}m ${secondsSpent}s`;
        
        const minutesLeft = Math.floor(testData.timeLeft / 60);
        const secondsLeft = testData.timeLeft % 60;
        const timeLeftFormatted = `${minutesLeft}m ${secondsLeft}s`;
        
        // Create detailed report
        let report = `📝 *New Test Submission*\n\n`;
        report += `👤 *Student:* ${testData.studentName}\n`;
        report += `⏱️ *Time Spent:* ${timeSpentFormatted}\n`;
        report += `⏰ *Time Left:* ${timeLeftFormatted}\n`;
        report += `📊 *Score:* ${correctAnswers}/${totalQuestions} (${score}%)\n`;
        report += `🚪 *Page Leaves:* ${testData.leaveCount}\n`;
        report += `📅 *Test Date:* ${new Date(testData.startTime).toLocaleString()}\n\n`;
        
        // Add submission method
        if (testData.timeLeft <= 0) {
            report += `🕒 *Submission Method:* Time's Up (Auto-submitted)\n\n`;
        } else if (testData.leaveCount > maxLeaves) {
            report += `🚪 *Submission Method:* Too Many Page Leaves (Auto-submitted)\n\n`;
        } else {
            report += `✅ *Submission Method:* Manual Submission\n\n`;
        }
        
        report += `*Detailed Results:*\n`;
        testData.questions.forEach((q, index) => {
            const isCorrect = q.selected === q.correct;
            const selectedOption = q.selected !== undefined ? q.options[q.selected] : 'Not answered';
            const correctOption = q.options[q.correct];
            const emoji = isCorrect ? '✅' : '❌';
            
            report += `\n${emoji} *Q${index + 1}:* ${q.question}\n`;
            report += `   Student's answer: ${selectedOption}\n`;
            if (!isCorrect) {
                report += `   Correct answer: ${correctOption}\n`;
            }
        });

        // Send to Telegram
        if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
            await sendTelegramMessage(report);
        }

        // Log to console
        console.log('Test submission:', {
            student: testData.studentName,
            score: `${correctAnswers}/${totalQuestions}`,
            timeSpent: timeSpentFormatted,
            timeLeft: timeLeftFormatted,
            leaves: testData.leaveCount,
            submissionMethod: testData.timeLeft <= 0 ? 'Time Up' : testData.leaveCount > maxLeaves ? 'Too Many Leaves' : 'Manual'
        });

        res.status(200).json({ 
            success: true, 
            message: 'Test submitted successfully',
            studentName: testData.studentName
        });

    } catch (error) {
        console.error('Error processing test submission:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            details: error.message 
        });
    }
};

async function sendTelegramMessage(message) {
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'Markdown'
            })
        });

        const result = await response.json();
        
        if (!result.ok) {
            console.error('Telegram API error:', result);
        }
        
        return result;
    } catch (error) {
        console.error('Error sending Telegram message:', error);
    }
}
