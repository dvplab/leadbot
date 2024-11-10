const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

// Токен бота
const token = process.env.BOT_TOKEN; // Замените на ваш токен

// chat ID вашей группы (куда будет отправляться информация)
const groupChatId = process.env.GROUP_CHAT_ID; // Замените на chat_id вашей группы

// Создаем экземпляр бота
const bot = new TelegramBot(token, { polling: true });

let userData = {}; // Сюда будем сохранять данные пользователя
let currentStep = {}; // Сохраняем текущий шаг каждого пользователя

// Устанавливаем список команд
bot.setMyCommands([
    { command: '/start', description: 'Запустить бота' },
    { command: '/help', description: 'Получить помощь' },
    { command: '/cancel', description: 'Отменить заявку' },
]);

// Обработка команды /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(
        chatId,
        'Привет! Я бот для сбора заявок на разработку Telegram-ботов.',
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Начать заявку', callback_data: 'start_request' }],
                ],
            },
        }
    );
});

// Обработка команды /help
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(
        chatId,
        'Это бот для сбора заявок на разработку Telegram-ботов.\n\n' +
            'Для начала отправьте команду /start и следуйте указаниям.\n\n' +
            'Когда будете готовы завершить заявку, просто отправьте свои контактные данные.\n\n' +
            'Также можно прикрепить файл с описанием проекта. Все данные будут отправлены в группу.'
    );
});

// Обработка команды /cancel
bot.onText(/\/cancel/, (msg) => {
    const chatId = msg.chat.id;
    if (userData[chatId]) {
        delete userData[chatId]; // Сбрасываем данные
        delete currentStep[chatId]; // Сбрасываем текущий шаг
        bot.sendMessage(
            chatId,
            'Ваша заявка была отменена. Начните заново, отправив команду /start.'
        );
    } else {
        bot.sendMessage(chatId, 'У вас нет незавершенной заявки.');
    }
});

// Обработка кнопки "Начать заявку"
bot.on('callback_query', (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const action = callbackQuery.data;

    if (action === 'start_request') {
        userData[chatId] = {}; // Инициализируем данные для нового пользователя
        currentStep[chatId] = 'name'; // Устанавливаем текущий шаг на "name"
        bot.sendMessage(chatId, 'Отлично! Напишите ваше имя.');
    } else if (action === 'edit_name') {
        currentStep[chatId] = 'name'; // Возвращаемся к шагу "name"
        bot.sendMessage(chatId, 'Введите ваше имя снова:');
    } else if (action === 'edit_description') {
        currentStep[chatId] = 'description'; // Возвращаемся к шагу "description"
        bot.sendMessage(
            chatId,
            'Введите описание бота снова или прикрепите файл:'
        );
    } else if (action === 'edit_contacts') {
        currentStep[chatId] = 'contacts'; // Возвращаемся к шагу "contacts"
        bot.sendMessage(chatId, 'Введите ваши контакты снова:');
    } else if (action === 'cancel_edit') {
        delete userData[chatId]; // Сбрасываем данные
        delete currentStep[chatId]; // Сбрасываем текущий шаг
        bot.sendMessage(
            chatId,
            'Отмена редактирования. Начинаем с шага 1. Напишите ваше имя.'
        );
    }
});

// Шаги с возможностью редактирования
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text;

    if (!userData[chatId] || !currentStep[chatId]) {
        return;
    }

    if (currentStep[chatId] === 'name') {
        userData[chatId].name = messageText;
        currentStep[chatId] = 'description'; // Переходим к следующему шагу
        bot.sendMessage(
            chatId,
            'Отлично! Теперь опишите бота, которого нужно разработать, или прикрепите файл с описанием.',
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Назад', callback_data: 'edit_name' }],
                    ],
                },
            }
        );
    } else if (currentStep[chatId] === 'description') {
        if (msg.document) {
            // Если был прикреплен файл
            userData[chatId].description =
                'Прикреплен файл: ' + msg.document.file_name;
            userData[chatId].file_id = msg.document.file_id; // Сохраняем file_id файла
            currentStep[chatId] = 'contacts'; // Переходим к следующему шагу
            bot.sendMessage(
                chatId,
                'Спасибо за описание ! Теперь, пожалуйста, напишите ваши контакты, чтобы мы могли с вами связаться.',
                {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: 'Назад',
                                    callback_data: 'edit_description',
                                },
                            ],
                        ],
                    },
                }
            );
        } else {
            userData[chatId].description = messageText;
            currentStep[chatId] = 'contacts'; // Переходим к следующему шагу
            bot.sendMessage(
                chatId,
                'Спасибо за описание! Теперь, пожалуйста, напишите ваши контакты, чтобы мы могли с вами связаться.',
                {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: 'Назад',
                                    callback_data: 'edit_description',
                                },
                            ],
                        ],
                    },
                }
            );
        }
    } else if (currentStep[chatId] === 'contacts') {
        userData[chatId].contacts = messageText;
        currentStep[chatId] = null; // Все данные собраны
        bot.sendMessage(
            chatId,
            'Спасибо! Все данные собраны. Мы с вами свяжемся в ближайшее время.',
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Назад', callback_data: 'edit_contacts' }],
                    ],
                },
            }
        );

        // Отправляем данные в группу
        const { name, description, contacts, file_id } = userData[chatId];
        let message = `Новая заявка:\n\nИмя: ${name}\nОписание бота: ${description}\nКонтакты: ${contacts}`;

        if (file_id) {
            // Если файл был прикреплен, отправляем его в группу
            bot.sendDocument(groupChatId, file_id);
        }

        // Отправляем текстовое сообщение в группу
        bot.sendMessage(groupChatId, message);

        // Очищаем данные пользователя после отправки
        delete userData[chatId];
        delete currentStep[chatId];
    }
});
